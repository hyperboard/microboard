import {
	BoardEventListMsg,
	BoardEventMsg,
	ConfirmationMsg,
	Connection,
	EventsMsg,
	SnapshotRequestMsg,
	SnapshotResponseMsg,
	SubscribeConfirmationMsg,
	ViewModeMsg,
} from "App/Connection";
import { Board } from "Board";
import { BoardSnapshot } from "Board/Board";
import { Subject } from "Subject";
import { Command } from "./Command";
import { EventsCommand } from "./EventsCommand";
import { createEventsLog } from "./EventsLog";
import { EventsOperation, Operation } from "./EventsOperations";

export interface BoardEvent {
	order: number;
	body: BoardEventBody;
}

export interface BoardEventBody {
	eventId: string;
	userId: number;
	boardId: string;
	operation: Operation;
}

export interface BoardEventPack {
	order: number;
	body: BoardEventPackBody;
}

export interface BoardEventPackBody {
	eventId: string;
	userId: number;
	boardId: string;
	operations: Operation[];
}

export interface Events {
	subject: Subject<BoardEvent>;
	serialize(): BoardEvent[];
	deserialize(serializedData: BoardEvent[]): void;
	getSnapshot(): BoardSnapshot;
	disconnect(): void;
	emit(operation: Operation, command: Command): void;
	apply(operation: EventsOperation): void | false;
	undo(): void;
	redo(): void;
	canUndo(): boolean;
	canRedo(): boolean;
}

type MessageHandler<T extends EventsMsg = EventsMsg> = (message: T) => void;

export function createEvents(board: Board, connection: Connection): Events {
	const log = createEventsLog(board);
	const latestEvent: { [key: string]: number } = {};
	let latestServerOrder = 0;
	const subject = new Subject<BoardEvent>();

	let currentSequenceNumber = 0;
	let pendingEvent: {
		event: BoardEventPack;
		sequenceNumber: number;
		lastSentTime: number;
	} | null = null;
	const PUBLISH_INTERVAL = 100; // 100 мс (10 раз в секунду)
	const RESEND_INTERVAL = 1000; // 1 секунда
	let publishIntervalTimer: NodeJS.Timeout | null = null;
	let resendIntervalTimer: NodeJS.Timeout | null = null;

	interface MessageRouter {
		addHandler: <T extends EventsMsg>(
			type: string,
			handler: MessageHandler<T>,
		) => void;
		handleMessage: (message: EventsMsg) => void;
	}

	function createMessageRouter(): MessageRouter {
		const handlers: Map<string, MessageHandler> = new Map();

		function addHandler<T extends EventsMsg>(
			type: string,
			handler: MessageHandler<T>,
		): void {
			handlers.set(type, (message: EventsMsg) => {
				if (message.type === type) {
					(handler as MessageHandler<typeof message>)(message);
				}
			});
		}

		function handleMessage(message: EventsMsg): void {
			const handler = handlers.get(message.type);
			if (handler) {
				handler(message);
			} else {
				console.warn(`Unhandled message type: ${message.type}`);
			}
		}

		return { addHandler, handleMessage };
	}

	const messageRouter = createMessageRouter();

	connection.subscribe(board.getBoardId(), messageRouter.handleMessage);

	function disconnect(): void {
		connection.unsubscribe(board.getBoardId(), messageRouter.handleMessage);
	}

	function handleViewModeMessage(): void {
		board.interfaceType = "view";
		board.tools.publish();
	}
	messageRouter.addHandler<ViewModeMsg>("ViewMode", handleViewModeMessage);

	function handleBoardEventMessage(message: BoardEventMsg): void {
		const event = message.event;

		if (event.order <= latestServerOrder) {
			return;
		}

		const eventUserId = parseFloat(event.body.eventId.split(":")[0]);
		const currentUserId = getUserId();

		const isEventFromCurrentUser = eventUserId === currentUserId;

		if (isEventFromCurrentUser) {
			return;
		}

		log.insertEvents(event);
		const last = log.getLastConfirmed();
		if (last) {
			subject.publish(last);
		}
		latestServerOrder = log.getLatestOrder();
	}
	messageRouter.addHandler<BoardEventMsg>(
		"BoardEvent",
		handleBoardEventMessage,
	);

	function handleBoardEventListMessage(message: BoardEventListMsg): void {
		const isFirstBatchOfEvents =
			log.getList().length === 0 && message.events.length > 0;
		if (isFirstBatchOfEvents) {
			handleFirstBatchOfEvents(message.events);
		} else {
			const events = message.events;
			log.insertEvents(events);
			latestServerOrder = log.getLatestOrder();
			subject.publish(events[0]);
		}
		onBoardLoad();
	}

	messageRouter.addHandler<BoardEventListMsg>(
		"BoardEventList",
		handleBoardEventListMessage,
	);

	function handleCreateSnapshotRequestMessage(): void {
		const snapshot = log.getSnapshot();
		connection.publishSnapshot(board.getBoardId(), snapshot);
	}

	messageRouter.addHandler<SnapshotRequestMsg>(
		"CreateSnapshotRequest",
		handleCreateSnapshotRequestMessage,
	);

	function handleBoardSnapshotMessage(message: SnapshotResponseMsg): void {
		const existingSnapshot = board.getSnapshot();
		if (existingSnapshot.lastIndex > 0) {
			handleNewerEvents(message.snapshot, existingSnapshot);
		} else {
			board.deserialize(message.snapshot);
		}
		board.saveSnapshot(message.snapshot);
		onBoardLoad();
	}
	messageRouter.addHandler<SnapshotResponseMsg>(
		"BoardSnapshot",
		handleBoardSnapshotMessage,
	);

	function handleFirstBatchOfEvents(events: BoardEvent[]): void {
		log.insertEvents(events);
		subject.publish(events[0]);
		latestServerOrder = log.getLatestOrder();
		handleCameraAdjustment();
	}

	function handleCameraAdjustment(): void {
		if (!board.camera.useSavedSnapshot(board.getCameraSnapshot())) {
			if (board.items.listAll().length > 0) {
				const itemsMbr = board.items.getMbr();
				board.camera.zoomToFit(itemsMbr);
			}
		}
	}

	function handleNewerEvents(
		snapshot: BoardSnapshot,
		existingSnapshot: BoardSnapshot,
	): void {
		const newerEvents = snapshot.events.filter(
			event => event.order > existingSnapshot.lastIndex,
		);
		if (newerEvents.length > 0) {
			log.insertEvents(newerEvents);
			const last = log.getLastConfirmed();
			if (last) {
				subject.publish(last);
			}
			latestServerOrder = log.getLatestOrder();
		}
	}

	function handleSubscribeConfirmation(msg: SubscribeConfirmationMsg): void {
		currentSequenceNumber = msg.initialSequenceNumber;
		startIntervals();
	}
	messageRouter.addHandler<SubscribeConfirmationMsg>(
		"SubscribeConfirmation",
		handleSubscribeConfirmation,
	);

	function startIntervals(): void {
		if (publishIntervalTimer) {
			clearInterval(publishIntervalTimer);
		}
		if (resendIntervalTimer) {
			clearInterval(resendIntervalTimer);
		}

		publishIntervalTimer = setInterval(tryPublishEvent, PUBLISH_INTERVAL);
		resendIntervalTimer = setInterval(tryResendEvent, RESEND_INTERVAL);
	}

	function stopIntervals(): void {
		if (publishIntervalTimer) {
			clearInterval(publishIntervalTimer);
			publishIntervalTimer = null;
		}
		if (resendIntervalTimer) {
			clearInterval(resendIntervalTimer);
			resendIntervalTimer = null;
		}
	}

	function tryPublishEvent(): void {
		if (pendingEvent === null) {
			const unpublishedEvent = log.getUnpublishedEvent();
			if (unpublishedEvent) {
				sendBoardEvent(
					board.getBoardId(),
					unpublishedEvent,
					currentSequenceNumber,
				);
				currentSequenceNumber++;
			}
		}
	}

	function tryResendEvent(): void {
		if (
			pendingEvent &&
			Date.now() - pendingEvent.lastSentTime >= RESEND_INTERVAL
		) {
			sendBoardEvent(
				board.getBoardId(),
				pendingEvent.event,
				currentSequenceNumber,
			);
		}
	}

	function handleConfirmation(msg: ConfirmationMsg): void {
		if (
			pendingEvent &&
			pendingEvent.sequenceNumber === msg.sequenceNumber
		) {
			pendingEvent.event.order = msg.order;
			log.confirmEvent(pendingEvent.event);
			pendingEvent = null;
		}
	}
	messageRouter.addHandler<ConfirmationMsg>(
		"Confirmation",
		handleConfirmation,
	);

	function sendBoardEvent(
		boardId: string,
		event: BoardEventPack,
		sequenceNumber: number,
	): void {
		connection.publishBoardEvent(boardId, event, sequenceNumber);

		pendingEvent = {
			event,
			sequenceNumber,
			lastSentTime: Date.now(),
		};
	}

	function onBoardLoad(): void {
		const searchParams = new URLSearchParams(
			window.location.search.slice(1),
		);
		const toFocusId = searchParams.get("focus") ?? "";
		const toFocusItem = board.items.getById(toFocusId);
		if (toFocusItem) {
			const mbr = toFocusItem.getMbr();
			mbr.left -= 50;
			mbr.top -= 50;
			mbr.right += 50;
			mbr.bottom += 50;
			board.camera.zoomToFit(mbr);
		}
		board.camera.setBoardId(board.getBoardId());
	}

	function emit(operation: Operation, command: Command): void {
		const userId = getUserId();
		const body = {
			eventId: getNextEventId(),
			userId,
			boardId: board.getBoardId(),
			operation: operation,
		} as BoardEventBody;
		const event = { order: 0, body };
		const record = { event, command };
		log.push(record);
		setLatestUserEvent(operation, userId);
		subject.publish(event);
	}

	const operationHandlers: Record<string, (eventId: string) => void | false> =
		{};

	function addOperationHandler(
		method: string,
		handler: (eventId: string) => void | false,
	): void {
		operationHandlers[method] = handler;
	}

	function apply(operation: EventsOperation): void | false {
		const handler = operationHandlers[operation.method];
		if (handler) {
			return handler(operation.eventId);
		}
		return false;
	}

	let eventCounter = 0;

	function getNextEventId(): string {
		const id = ++eventCounter;
		const userId = getUserId();
		return userId + ":" + id;
	}

	function applyUndo(updateLocalId: string): void {
		const record = log.getRecordById(updateLocalId);
		if (!record) {
			return;
		}
		record.command.revert();
	}

	addOperationHandler("undo", applyUndo);

	function undo(apply = true): void {
		const currentUserId = getUserId();
		const record = log.getUndoRecord(currentUserId);
		if (!record) {
			return;
		}
		const { operation, userId, eventId } = record.event.body;
		const canUndo = canUndoEvent(operation, userId);
		if (!canUndo) {
			return;
		}
		const undoOp: EventsOperation = {
			class: "Events",
			method: "undo",
			eventId,
		};
		const command = new EventsCommand(instance, undoOp);
		if (apply) {
			command.apply();
		}
		emit(undoOp, command);
	}

	function applyRedo(updateLocalId: string): void {
		const record = log.getRecordById(updateLocalId);
		if (!record) {
			return;
		}
		if (record.event.body.operation.method === "undo") {
			const undoable = log.getRecordById(
				record.event.body.operation.eventId,
			);
			undoable?.command.apply();
		} else {
			record.command.apply();
		}
	}

	addOperationHandler("redo", applyRedo);

	function redo(apply = true): void {
		const userId = getUserId();
		const record = log.getRedoRecord(userId);
		if (!record) {
			return;
		}
		const operation: EventsOperation = {
			class: "Events",
			method: "redo",
			eventId: record.event.body.eventId,
		};
		const command = new EventsCommand(instance, operation);
		if (apply) {
			command.apply();
		}
		emit(operation, command);
	}

	function canUndoEvent(op: Operation, byUserId?: number): boolean {
		if (op.method === "undo") {
			return false;
		}
		const isRedoPasteOrDuplicate =
			op.method === "redo" ||
			op.method === "paste" ||
			op.method === "duplicate";
		if (isRedoPasteOrDuplicate) {
			return true;
		}
		const key = getOpKey(op);
		const latest = latestEvent[key];
		return byUserId === undefined || byUserId === latest;
	}

	function setLatestUserEvent(op: Operation, userId: number): void {
		if (
			op.class !== "Events" &&
			op.method !== "paste" &&
			op.method !== "duplicate"
		) {
			const key = getOpKey(op);
			latestEvent[key] = userId;
		}
	}

	function getOpKey(op: Operation): string {
		return "item" in op ? `${op.method}_${op.item}` : op.method;
	}

	function canUndo(): boolean {
		const userId = getUserId();
		const record = log.getUndoRecord(userId);
		if (!record) {
			return false;
		}
		return canUndoEvent(
			record.event.body.operation,
			record.event.body.userId,
		);
	}

	function canRedo(): boolean {
		const userId = getUserId();
		const record = log.getRedoRecord(userId);
		return record !== null;
	}

	function getUserId(): number {
		return connection.connectionId;
	}

	const instance: Events = {
		subject,
		serialize: log.serialize,
		deserialize: log.deserialize,
		getSnapshot: log.getSnapshot,
		disconnect,
		emit,
		apply,
		undo,
		redo,
		canUndo,
		canRedo,
	};

	return instance;
}
