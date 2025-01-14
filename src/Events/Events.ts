import {
	BoardEventListMsg,
	BoardEventMsg,
	BoardSubscriptionCompletedMsg,
	ConfirmationMsg,
	Connection,
	EventsMsg,
	SnapshotRequestMsg,
	SnapshotResponseMsg,
	SubscribeConfirmationMsg,
	type ModeMsg,
	ViewMode,
	AiChatMsg,
	ChatChunk,
} from "App/Connection";
import { Board } from "Board";
import { BoardSnapshot } from "Board/Board";
import { Subject } from "Subject";
import { Command } from "./Command";
import { EventsCommand } from "./EventsCommand";
import { createEventsLog } from "./EventsLog";
import { SyncLog, SyncLogSubject } from "./SyncLog";
import { EventsOperation, Operation } from "./EventsOperations";
import { notify } from "View/Ui/Toast";
import { isMicroboard } from "lib/isMicroboard";
import i18next from "i18next";
import toast from "react-hot-toast";
import {
	PresenceEventMsg,
	PresenceEventType,
	UserJoinMsg,
} from "Board/Presence/Events";
import i18n from "Lang";
import { getControlPointData } from "Board/Selection/QuickAddButtons/quickAddHelpers";

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
	operations: (Operation & { actualId?: string })[];
}

export interface SyncBoardEvent extends BoardEvent {
	lastKnownOrder: number;
}

interface SyncBoardEventPackBody extends BoardEventPackBody {
	lastKnownOrder: number;
}
export interface SyncBoardEventPack extends BoardEventPack {
	body: SyncBoardEventPackBody;
}

export type SyncEvent = SyncBoardEvent | SyncBoardEventPack;

export interface RawEvents {
	confirmedEvents: BoardEvent[];
	eventsToSend: BoardEvent[];
	newEvents: BoardEvent[];
}

export interface Events {
	subject: Subject<BoardEvent>;
	serialize(): BoardEvent[];
	deserialize(serializedData: BoardEvent[]): void;
	getRaw: () => RawEvents;
	getAll: () => BoardEvent[];
	getSyncLog: () => SyncLog;
	syncLogSubject: SyncLogSubject;
	getSnapshot(): BoardSnapshot;
	disconnect(): void;
	emit(operation: Operation, command: Command): void;
	apply(operation: EventsOperation): void | false;
	undo(): void;
	redo(): void;
	canUndo(): boolean;
	canRedo(): boolean;
	getNotificationId(): string | null;
	getSaveFileTimeout(): NodeJS.Timeout | null;
	removeBeforeUnloadListener(): void;
	sendPresenceEvent(event: PresenceEventType): void;
}

type MessageHandler<T extends EventsMsg = EventsMsg> = (message: T) => void;

export function createEvents(
	board: Board,
	connection: Connection,
	lastOrder: number,
): Events {
	const log = createEventsLog(board);
	const latestEvent: { [key: string]: number } = {};
	let latestServerOrder = lastOrder;
	const subject = new Subject<BoardEvent>();

	let currentSequenceNumber = 0;
	let pendingEvent: {
		event: BoardEventPack;
		sequenceNumber: number;
		lastSentTime: number;
	} | null = null;
	let firstSentTime: number | null = null;
	const PUBLISH_INTERVAL = 100; // 100 мс (10 раз в секунду)
	const RESEND_INTERVAL = 1000; // 1 секунда
	let publishIntervalTimer: NodeJS.Timeout | null = null;
	let resendIntervalTimer: NodeJS.Timeout | null = null;
	let saveFileTimeout: NodeJS.Timeout | null = null;
	let notificationId: null | string = null;

	const beforeUnloadListener = (event: BeforeUnloadEvent): void => {
		event.preventDefault();
		event.returnValue = "Do not leave the page to avoid losing data";
	};

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

	function disconnect(): void {
		enforceMode("loading");
		connection.unsubscribe(board.getBoardId(), messageRouter.handleMessage);
	}

	function handleAiChatMassage(massage: AiChatMsg) {
		if (massage.type === "AiChat") {
			const event = massage.event;
			if (event.method === "ChatChunk") {
				handleChatChunk(event);
			}
		}
	}

	messageRouter.addHandler<AiChatMsg>("AiChat", handleAiChatMassage);

	function handleChatChunk(chunk: ChatChunk): void {
		const itemId = chunk.itemId;
		const item = board.items.getById(itemId);
		console.log("chunk", chunk);
		switch (chunk.type) {
			case "chunk":
				if (!item || item.itemType !== "AINode") {
					return;
				}
				const connector = board.items.getConnectorsByItemIds(
					item.getParentId(),
					item.getId(),
				)[0];
				item.text.editor.insertAICopiedText(chunk.content || "");
				const adjustmentPoint = item.getAdjustmentPoint();
				if (adjustmentPoint) {
					const centerX = item.getMbr().getCenter().x;
					if (centerX > adjustmentPoint.x) {
						item.transformation.translateBy(
							adjustmentPoint.x - centerX,
							0,
						);
					}
					if (connector) {
						connector.setEndPoint(getControlPointData(item, 2));
					}
				}
				break;
			case "done":
				if (!item || item.itemType !== "AINode") {
					console.log("Chat is done");
					return;
				}
				board.selection.items.removeAll();
				board.selection.add(item);
				item.removeAdjustmentPoint();
				item.getRichText().editor.deserializeMarkdown();
				break;
			case "end":
				if (!item || item.itemType !== "AINode") {
					console.log("User's request handled");
					return;
				}
				board.selection.items.removeAll();
				board.selection.add(item);
				item.removeAdjustmentPoint();
				item.getRichText().editor.deserializeMarkdown();
				break;
			case "error":
				if (!item || item.itemType !== "AINode") {
					console.error("Chat error:", chunk.error);
					return;
				}
				item.text.editor.insertAICopiedText("Error");
				break;
			default:
				if (!item || item.itemType !== "AINode") {
					console.warn("Unknown chunk type:", chunk.type);
					return;
				}
				item.text.editor.insertAICopiedText("Error");
		}
	}

	function handleModeMessage(message: ModeMsg): void {
		if (board.getInterfaceType() !== message.mode) {
			enforceMode(message.mode);
			notify({
				header: i18n.t("sharing.settingsChanged.heading"),
				body:
					message.mode === "edit"
						? i18n.t("sharing.settingsChanged.bodyEdit")
						: i18n.t("sharing.settingsChanged.bodyView"),
				duration: 5000,
			});
		}
	}

	function enforceMode(mode: ViewMode): void {
		board.setInterfaceType(mode);
	}

	messageRouter.addHandler<ModeMsg>("Mode", handleModeMessage);

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

	function handlePresenceEventMessage(message: PresenceEventMsg): void {
		board.presence.push(message);
	}

	messageRouter.addHandler<PresenceEventMsg>(
		"PresenceEvent",
		handlePresenceEventMessage,
	);

	function handleUserJoinMessage(message: UserJoinMsg): void {
		board.presence.join(message);
	}

	messageRouter.addHandler<UserJoinMsg>("UserJoin", handleUserJoinMessage);

	function handleBoardEventListMessage(message: BoardEventListMsg): void {
		handleBoardEventListApplication(message.events);
	}

	messageRouter.addHandler<BoardEventListMsg>(
		"BoardEventList",
		handleBoardEventListMessage,
	);

	function handleCreateSnapshotRequestMessage(): void {
		const snapshot = log.getSnapshot();
		connection.publishSnapshot(board.getBoardId(), snapshot);
		// board.saveSnapshot(snapshot);
	}

	messageRouter.addHandler<SnapshotRequestMsg>(
		"CreateSnapshotRequest",
		handleCreateSnapshotRequestMessage,
	);

	function handleBoardSnapshotMessage(message: SnapshotResponseMsg): void {
		handleSnapshotApplication(message.snapshot);
	}
	messageRouter.addHandler<SnapshotResponseMsg>(
		"BoardSnapshot",
		handleBoardSnapshotMessage,
	);

	function handleBoardSubscriptionCompletedMsg(
		msg: BoardSubscriptionCompletedMsg,
	): void {
		handleSeqNumApplication(msg.initialSequenceNumber);
		if (msg.snapshot) {
			handleSnapshotApplication(msg.snapshot);
		}
		handleBoardEventListApplication(msg.eventsSinceLastSnapshot);
		enforceMode(msg.mode);
		onBoardLoad();
	}

	messageRouter.addHandler(
		"BoardSubscriptionCompleted",
		handleBoardSubscriptionCompletedMsg,
	);

	function handleSeqNumApplication(initialSequenceNumber: number): void {
		currentSequenceNumber = initialSequenceNumber;
		if (pendingEvent) {
			pendingEvent.sequenceNumber = currentSequenceNumber;
		}
		startIntervals();
	}

	function handleSnapshotApplication(snapshot: BoardSnapshot): void {
		const existingSnapshot = board.getSnapshot();
		if (existingSnapshot.lastIndex > 0) {
			handleNewerEvents(snapshot, existingSnapshot);
		} else {
			board.deserialize(snapshot);
		}
		// board.saveSnapshot(snapshot);
	}

	function handleBoardEventListApplication(events: SyncBoardEvent[]): void {
		const existinglist = log.getList();

		const isFirstBatchOfEvents =
			existinglist.length === 0 && events.length > 0;

		if (isFirstBatchOfEvents) {
			handleFirstBatchOfEvents(events);
		} else {
			const maxOrder = Math.max(
				...existinglist.map(record => record.event.order),
			);

			const newEvents = events.filter(event => event.order > maxOrder);

			if (newEvents.length > 0) {
				log.insertEvents(newEvents);
				latestServerOrder = log.getLatestOrder();
				subject.publish(newEvents[0]);
			}
		}

		// board.saveSnapshot();
	}

	function handleFirstBatchOfEvents(events: SyncBoardEvent[]): void {
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
		handleSeqNumApplication(msg.initialSequenceNumber);
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
			}
		}
	}

	function tryResendEvent(): void {
		const date = Date.now();
		if (
			pendingEvent &&
			date - pendingEvent.lastSentTime >= RESEND_INTERVAL
		) {
			if (firstSentTime && date - firstSentTime >= RESEND_INTERVAL * 5) {
				board.presence.clear();
				if (!notificationId) {
					window.addEventListener(
						"beforeunload",
						beforeUnloadListener,
					);
					if (isMicroboard()) {
						notificationId = notify({
							header: i18next.t(
								"notifications.restoringConnectionHeader",
							),
							body: i18next.t(
								"notifications.restoringConnectionBody",
							),
							variant: "warning",
							duration: Infinity,
						});
					} else {
						notificationId = notify({
							header: i18next.t(
								"notifications.connectionLostHeader",
							),
							variant: "black",
							duration: Infinity,
							position: "bottom-center",
						});
					}
				}
			}

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
			if (notificationId) {
				window.removeEventListener(
					"beforeunload",
					beforeUnloadListener,
				);
				toast.dismiss(notificationId);
				notificationId = null;
			}
			currentSequenceNumber++;
			pendingEvent.event.order = msg.order;
			log.confirmEvent(pendingEvent.event);
			pendingEvent = null;
			firstSentTime = null;
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
		const toSend: SyncEvent = {
			...event,
			body: {
				...event.body,
				lastKnownOrder: log.getLatestOrder(),
			},
		};
		connection.publishBoardEvent(boardId, toSend, sequenceNumber);

		const date = Date.now();
		pendingEvent = {
			event: toSend,
			sequenceNumber,
			lastSentTime: date,
		};
		if (!firstSentTime) {
			firstSentTime = date;
		}
	}

	function sendPresenceEvent(event: PresenceEventType): void {
		connection.publishPresenceEvent(board.getBoardId(), event);
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

		if (board.getBoardId().includes("local")) {
			if (saveFileTimeout) {
				clearTimeout(saveFileTimeout);
			}
			saveFileTimeout = setTimeout(async () => {
				if (board.saveEditingFile) {
					await board.saveEditingFile();
				}
				saveFileTimeout = null;
				subject.publish(event);
			}, 1000);
		}
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
		if (record.event.body.operation.method === "undo") {
			record.command.apply();
		} else {
			record.command.revert();
		}
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
		// return "item" in op ? `${op.method}_${op.item}` : op.method;
		return op.method;
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

	function getRaw(): RawEvents {
		const rawLog = log.getRaw();
		return {
			confirmedEvents: rawLog.confirmedRecords.map(
				record => record.event,
			),
			eventsToSend: rawLog.recordsToSend.map(record => record.event),
			newEvents: rawLog.newRecords.map(record => record.event),
		};
	}

	const instance: Events = {
		subject,
		serialize: log.serialize,
		deserialize: log.deserialize,
		getSnapshot: log.getSnapshot,
		getRaw,
		getSyncLog: log.getSyncLog,
		syncLogSubject: log.syncLogSubject,
		getAll: () => log.getList().map(record => record.event),
		disconnect,
		emit,
		apply,
		undo,
		redo,
		canUndo,
		canRedo,
		removeBeforeUnloadListener: () => {
			window.removeEventListener("beforeunload", beforeUnloadListener);
		},
		getNotificationId: () => notificationId,
		getSaveFileTimeout: () => saveFileTimeout,
		sendPresenceEvent,
	};

	connection.subscribe(
		board.getBoardId(),
		messageRouter.handleMessage,
		function getLatestServerOrder(): number {
			return latestServerOrder;
		},
		board.getAccessKey(),
	);

	return instance;
}
