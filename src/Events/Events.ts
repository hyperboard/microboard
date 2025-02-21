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
	GenerateImageResponse,
	GenerateAudioResponse,
} from "App/Connection";
import { Board } from "Board";
import { BoardSnapshot } from "Board/Board";
import { Subject } from "Subject";
import { Command, createCommand } from "./Command";
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
import { prepareImage } from "Board/Items/Image/ImageHelpers";
import { t } from "i18next";
import { ImageItem } from "Board/Items/Image";
import { Connector } from "Board/Items";
import { getControlPointData } from "Board/Selection/QuickAddButtons";
import { isTemplateView } from "lib/queryStringParser";

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
	emit(operation: Operation, command?: Command): void;
	emitAndApply(operation: Operation, command?: Command): void;
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

	const publishSnapshotBeforeUnload = () => {
		handleCreateSnapshotRequestMessage();
	};

	window.addEventListener("beforeunload", publishSnapshotBeforeUnload);

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

	function handleAiChatMassage(message: AiChatMsg): void {
		if (message.type === "AiChat") {
			const event = message.event;
			switch (event.method) {
				case "ChatChunk":
					handleChatChunk(event);
					break;
				case "GenerateImage":
					handleImageGenerate(event);
					break;
				case "GenerateAudio":
					handleAudioGenerate(message.event);
					break;
			}
		}
	}

	messageRouter.addHandler<AiChatMsg>("AiChat", handleAiChatMassage);

	function handleChatChunk(chunk: ChatChunk): void {
		const itemId = chunk.itemId;
		const item = board.items.getById(itemId);
		switch (chunk.type) {
			case "chunk":
				if (!item || item.itemType !== "AINode") {
					return;
				}
				item.text.editor.processMarkdown(chunk.content || "");
				break;
			case "done":
				if (!item || item.itemType !== "AINode") {
					board.aiGeneratingOnItem = undefined;
					return;
				}
				item.getRichText().editor.processMarkdown(
					"StopProcessingMarkdown",
				);
				break;
			case "end":
				if (!item || item.itemType !== "AINode") {
					board.aiGeneratingOnItem = undefined;
					return;
				}
				item.getRichText().editor.processMarkdown(
					"StopProcessingMarkdown",
				);
				break;
			case "error":
				board.camera.unsubscribeFromItem();
				if (board.aiGeneratingOnItem) {
					const item = board.items.getById(board.aiGeneratingOnItem);
					if (item) {
						if (item.itemType === "AINode") {
							item.getRichText().editor.setStopProcessingMarkDownCb(
								null,
							);
						}
						board.selection.removeAll();
						board.selection.add(item);
						board.camera.zoomToFit(item.getMbr(), 20);
					}
				}
				console.log("Error AI generate", chunk.error);
				notify({
					header: t("AIInput.textGenerationError.header"),
					body: t("AIInput.textGenerationError.body"),
					variant: "error",
					duration: 4000,
				});
				board.aiGeneratingOnItem = undefined;
				break;
			default:
				board.camera.unsubscribeFromItem();
				notify({
					header: t("AIInput.textGenerationError.header"),
					body: t("AIInput.textGenerationError.body"),
					variant: "error",
					duration: 4000,
				});
				if (board.aiGeneratingOnItem) {
					const item = board.items.getById(board.aiGeneratingOnItem);
					if (item) {
						if (item.itemType === "AINode") {
							item.getRichText().editor.setStopProcessingMarkDownCb(
								null,
							);
						}
						board.selection.removeAll();
						board.selection.add(item);
						board.camera.zoomToFit(item.getMbr(), 20);
					}
				}
				board.aiGeneratingOnItem = undefined;
		}
	}

	function handleAudioGenerate(response: GenerateAudioResponse): void {
		function removePlaceholders(): void {
			const connector = board.items.getById(
				board.aiImageConnectorID || "",
			);
			if (connector) {
				board.remove(connector);
			}
			const aiNode = board.items.getById(board.aiGeneratingOnItem || "");
			if (aiNode) {
				board.remove(aiNode);
			}

			board.aiGeneratingOnItem = undefined;
			board.aiImageConnectorID = undefined;
		}

		if (response.status === "completed" && response.base64) {
			const audioBlob = new Blob(
				[
					Uint8Array.from(window.atob(response.base64), ch =>
						ch.charCodeAt(0),
					),
				],
				{ type: "audio/wav" },
			);
			const audioUrl = URL.createObjectURL(audioBlob);
			const link = document.createElement("a");
			link.href = audioUrl;
			link.download = "generated_audio.wav";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(audioUrl);
			removePlaceholders();
		} else if (response.status === "error") {
			console.error("Audio generation error:", response.message);
			notify({
				header: t("AIInput.audioGenerationError.header"),
				body: t("AIInput.audioGenerationError.body"),
				variant: "error",
				duration: 4000,
			});
			removePlaceholders();
		}
	}

	function handleImageGenerate(response: GenerateImageResponse): void {
		if (response.status === "completed" && response.base64) {
			prepareImage(response.base64)
				.then(imageData => {
					const placeholderId = board.aiImagePlaceholder?.getId();
					if (placeholderId) {
						const placeholderNode =
							board.items.getById(placeholderId);
						if (placeholderNode) {
							const imageItem = new ImageItem(
								{
									base64: imageData.base64,
									imageDimension: imageData.imageDimension,
									storageLink: imageData.storageLink,
								},
								board,
								board.events,
							);
							const placeholderMbr = placeholderNode.getMbr();
							const placeholderCenterX =
								placeholderMbr.left +
								placeholderMbr.getWidth() / 2;

							const imageCenterX =
								placeholderCenterX -
								imageData.imageDimension.width / 2;
							const imageTopY = placeholderMbr.top;

							imageItem.transformation.translateTo(
								imageCenterX,
								imageTopY,
							);
							imageItem.setId(placeholderId);

							board.remove(placeholderNode);
							const newImageAI = board.add(imageItem);

							newImageAI.doOnceOnLoad(() => {
								if (board.aiImageConnectorID) {
									const oldIdConnector = board.items.getById(
										board.aiImageConnectorID,
									) as Connector;

									oldIdConnector.setEndPoint(
										getControlPointData(newImageAI, 2),
									);
								}
								board.selection.removeAll();
								board.selection.add(newImageAI);
								board.camera.zoomToFit(newImageAI.getMbr());
							});
						}
					}
					board.aiGeneratingOnItem = undefined;
				})
				.catch(er => {
					console.error("Could not create image from response:", er);
				});
			board.aiGeneratingOnItem = undefined;
			return;
		} else if (response.status === "error") {
			console.error("Image generation error:", response.message);
			notify({
				header: t("AIInput.imageGenerationError.header"),
				body: t("AIInput.imageGenerationError.body"),
				variant: "error",
				duration: 4000,
			});
			board.aiGeneratingOnItem = undefined;
		} else {
			console.warn("Unhandled image generation status:", response.status);
		}
	}

	function handleModeMessage(message: ModeMsg): void {
		if (board.getInterfaceType() !== message.mode) {
			enforceMode(message.mode);
			if (isTemplateView()) {
				return;
			}
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

		const maxOrder = Math.max(
			...existinglist.map(record => record.event.order),
		);

		const newEvents = events.filter(event => event.order > maxOrder);

		if (newEvents.length > 0) {
			log.insertEvents(newEvents);
			latestServerOrder = log.getLatestOrder();
			subject.publish(newEvents[0]);
		}

		// board.saveSnapshot();
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
					window.removeEventListener(
						"beforeunload",
						publishSnapshotBeforeUnload,
					);
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
				window.addEventListener(
					"beforeunload",
					publishSnapshotBeforeUnload,
				);
			}
			currentSequenceNumber++;
			pendingEvent.event.order = msg.order;
			log.confirmEvent(pendingEvent.event);
			subject.publish({} as any);
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

		const cameraSnapshot = board.getCameraSnapshot();
		const hasItemsInBoard = board.items.listAll().length !== 0;
		const isItemsOutOfView =
			board.items.getItemsInView().length === 0 || !cameraSnapshot;

		if (isItemsOutOfView && hasItemsInBoard) {
			board.camera.zoomToFit(board.items.getMbr());
		}

		if (!hasItemsInBoard) {
			board.camera.zoomToViewCenter(1);
		}

		board.camera.setBoardId(board.getBoardId());
	}

	function emit(operation: Operation, command?: Command): void {
		const userId = getUserId();
		const body = {
			eventId: getNextEventId(),
			userId,
			boardId: board.getBoardId(),
			operation: operation,
		} as BoardEventBody;
		const event = { order: 0, body };
		const record = {
			event,
			command: command || createCommand(board, operation),
		};
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

	function emitAndApply(operation: Operation, command?: Command): void {
		const definedCommand = command || createCommand(board, operation);
		definedCommand.apply();
		emit(operation, definedCommand);
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
		emitAndApply,
		apply,
		undo,
		redo,
		canUndo,
		canRedo,
		removeBeforeUnloadListener: () => {
			window.removeEventListener("beforeunload", beforeUnloadListener);
			window.addEventListener(
				"beforeunload",
				publishSnapshotBeforeUnload,
			);
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
