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
import { Subject } from "shared/Subject";
import { Command, createCommand } from "./Command";
import { EventsCommand } from "./EventsCommand";
import { createEventsLog } from "./EventsLog";
import { SyncLog, SyncLogSubject } from "./SyncLog";
import { EventsOperation, Operation } from "./EventsOperations";
import {
	PresenceEventMsg,
	PresenceEventType,
	UserJoinMsg,
} from "Board/Presence/Events";
import { prepareImage } from "Board/Items/Image/ImageHelpers";
import { ImageItem } from "Board/Items/Image";
import { Connector } from "Board/Items";
import { getControlPointData } from "Board/Selection/QuickAddButtons";
import { isTemplateView } from "shared/lib/queryStringParser";
import { conf } from "Board/Settings";
import { AudioItem } from "Board/Items/Audio/Audio";
import { calculateAudioPosition } from "Board/Items/Audio/AudioHelpers";
import { AINode } from "Board/Items/AINode/AINode";
const { i18n } = conf;

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

export interface NotifyFunction {
	(options: {
		header: string;
		body: string;
		variant?: "info" | "success" | "warning" | "error";
		duration?: number;
	}): string; // Returns notification id
}

export interface Events {
	subject: Subject<BoardEvent>;
	serialize(): BoardEvent[];
	deserialize(serializedData: BoardEvent[]): void;
	deserializeAndApply(serializedData: BoardEvent[]): void;
	getRaw: () => RawEvents;
	getAll: () => BoardEvent[];
	getLastIndex: () => number;
	getSyncLog: () => SyncLog;
	syncLogSubject: SyncLogSubject;
	getSnapshot(): BoardSnapshot;
	getSnapshotToPublish(): Promise<SnapshotToPublish>;
	disconnect(): void;
	emit(operation: Operation, command?: Command): void;
	emitAndApply(operation: Operation, command?: Command): void;
	apply(operation: EventsOperation): void | false;
	undo(): void;
	redo(): void;
	canUndo(): boolean;
	canRedo(): boolean;
	getSaveFileTimeout(): NodeJS.Timeout | null;
	sendPresenceEvent(event: PresenceEventType): void;
	replay(): Promise<void>;
	handleEvent(message: EventsMsg);
}

type SnapshotToPublish = {
	boardId: string;
	snapshot: string;
	lastOrder: number;
};

type MessageHandler<T extends EventsMsg = EventsMsg> = (message: T) => void;

export function createEvents(
	board: Board,
	connection: Connection | undefined, // undefined for node or local
	lastIndex: number,
	notify: NotifyFunction,
): Events {
	const log = createEventsLog(board);
	const latestEvent: { [key: string]: number } = {};
	log.setSnapshotLastIndex(lastIndex);
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
		connection?.unsubscribe(board);
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
						board.selection.removeAll();
						board.selection.add(item);
						if (item.itemType === "AINode") {
							item.getRichText().editor.setStopProcessingMarkDownCb(
								null,
							);
							if (chunk.isExternalApiError) {
								const editor = item.getRichText().editor;
								editor.clearText();
								editor.insertCopiedText(
									i18n.t("AIInput.nodeErrorText"),
								);
							}
						}
						board.camera.zoomToFit(item.getMbr(), 20);
					}
				}
				console.log("Error AI generate", chunk.error);
				if (!chunk.isExternalApiError) {
					notify({
						header: i18n.t("AIInput.textGenerationError.header"),
						body: i18n.t("AIInput.textGenerationError.body"),
						variant: "error",
						duration: 4000,
					});
				}
				board.aiGeneratingOnItem = undefined;
				break;
			default:
				board.camera.unsubscribeFromItem();
				if (!chunk.isExternalApiError) {
					notify({
						header: i18n.t("AIInput.textGenerationError.header"),
						body: i18n.t("AIInput.textGenerationError.body"),
						variant: "error",
						duration: 4000,
					});
				}
				if (board.aiGeneratingOnItem) {
					const item = board.items.getById(board.aiGeneratingOnItem);
					if (item) {
						board.selection.removeAll();
						board.selection.add(item);
						if (item.itemType === "AINode") {
							item.getRichText().editor.setStopProcessingMarkDownCb(
								null,
							);
							if (chunk.isExternalApiError) {
								const editor = item.getRichText().editor;
								editor.clearText();
								editor.insertCopiedText(
									i18n.t("AIInput.nodeErrorText"),
								);
							}
						}
						board.camera.zoomToFit(item.getMbr(), 20);
					}
				}
				board.aiGeneratingOnItem = undefined;
		}
	}

	function handleAudioGenerate(response: GenerateAudioResponse): void {
		function replacePlaceholderNode(
			audioUrl: string,
			bs64: string | null,
		): void {
			const connector = board.items.getById(
				board.aiImageConnectorID || "",
			) as Connector | undefined;
			const placeholderNode = board.items.getById(
				board.aiGeneratingOnItem || "",
			) as AINode | undefined;
			if (!placeholderNode || !connector) {
				if (bs64) {
					downloadAudio(bs64);
				}
				if (placeholderNode) {
					board.remove(placeholderNode);
				}
				if (connector) {
					board.remove(connector);
				}
				return;
			}

			const audio = new AudioItem(
				audioUrl,
				board,
				true,
				board.events,
				"",
				"wav",
			);
			const { left, top, right } = placeholderNode.getMbr();
			audio.transformation.applyTranslateTo(
				left + (right - left - conf.AUDIO_DIMENSIONS.width) / 2,
				top,
			);
			audio.updateMbr();
			const threadDirection = placeholderNode.getThreadDirection();
			board.remove(placeholderNode, false);
			const boardAudio = board.add(audio);
			board.selection.removeAll();
			board.selection.add(boardAudio);
			const reverseIndexMap = {
				0: 1,
				1: 0,
				2: 3,
				3: 2,
			};
			connector.setEndPoint(
				getControlPointData(
					boardAudio,
					reverseIndexMap[threadDirection],
				),
			);

			board.aiGeneratingOnItem = undefined;
			board.aiImageConnectorID = undefined;
		}

		function downloadAudio(bs64: string): void {
			const audioBlob = new Blob(
				[Uint8Array.from(window.atob(bs64), ch => ch.charCodeAt(0))],
				{ type: "audio/wav" },
			);
			const audioUrl = URL.createObjectURL(audioBlob);
			const linkElem = conf.documentFactory.createElement(
				"a",
			) as HTMLAnchorElement;
			linkElem.href = audioUrl;
			linkElem.setAttribute(
				"download",
				`${board.getBoardId()}-generated.wav`,
			);
			linkElem.click();
		}

		const { base64, audioUrl } = response;
		if (response.status === "completed" && (base64 || audioUrl)) {
			if (audioUrl) {
				replacePlaceholderNode(audioUrl, base64);
			} else if (base64) {
				downloadAudio(base64);
			}
		} else if (response.status === "error") {
			const placeholderNode = board.items.getById(
				board.aiImageConnectorID || "",
			);
			if (placeholderNode) {
				board.selection.removeAll();
				board.selection.add(placeholderNode);
			}

			console.error("Audio generation error:", response.message);
			notify({
				header: i18n.t("AIInput.audioGenerationError.header"),
				body: i18n.t("AIInput.audioGenerationError.body"),
				variant: "error",
				duration: 4000,
			});
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
							// error
							imageItem.transformation.translateTo(
								imageCenterX,
								imageTopY,
							);
							imageItem.setId(placeholderId);
							let threadDirection = 3;
							if (placeholderNode.itemType === "AINode") {
								threadDirection =
									placeholderNode.getThreadDirection();
							}
							board.remove(placeholderNode, false);
							const newImageAI = board.add(imageItem);

							newImageAI.doOnceOnLoad(() => {
								if (board.aiImageConnectorID) {
									const oldIdConnector = board.items.getById(
										board.aiImageConnectorID,
									) as Connector;

									const reverseIndexMap = {
										0: 1,
										1: 0,
										2: 3,
										3: 2,
									};
									oldIdConnector.setEndPoint(
										getControlPointData(
											newImageAI,
											reverseIndexMap[threadDirection],
										),
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
			if (response.isExternalApiError) {
				if (board.aiGeneratingOnItem) {
					const item = board.items.getById(board.aiGeneratingOnItem);
					if (item) {
						board.selection.removeAll();
						board.selection.add(item);
						const editor = item.getRichText()?.editor;
						editor?.clearText();
						editor?.insertCopiedText(
							i18n.t("AIInput.nodeErrorText"),
						);
						board.camera.zoomToFit(item.getMbr(), 20);
					}
				}
			} else {
				notify({
					header: i18n.t("AIInput.imageGenerationError.header"),
					body: i18n.t("AIInput.imageGenerationError.body"),
					variant: "error",
					duration: 4000,
				});
			}
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

		if (event.order <= lastIndex) {
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
		lastIndex = log.getLastIndex();
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

	async function handleCreateSnapshotRequestMessage(): Promise<void> {
		const { boardId, snapshot, lastOrder } = await getSnapshotToPublish();
		connection?.publishSnapshot(boardId, snapshot, lastOrder);
		// board.saveSnapshot(snapshot);
	}

	async function getSnapshotToPublish(): Promise<SnapshotToPublish> {
		const boardId = board.getBoardId();
		// const snapshot = log.getSnapshot();
		log.revertUnconfirmed();
		const snapshot = await board.serializeHTML();
		const lastOrder = log.getLastIndex();
		log.applyUnconfirmed();
		return {
			boardId,
			snapshot,
			lastOrder,
		};
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

	// function handleSnapshotApplication(snapshot: BoardSnapshot): void {
	function handleSnapshotApplication(snapshot: string): void {
		const existingSnapshot = log.getSnapshot();
		const hasContent = existingSnapshot.lastIndex > 0;

		// if (hasContent) {
		// 	// We already have content, just apply newer events
		// 	// ERROR: we do not send events in snapshot anymore
		// 	handleNewerEvents(snapshot, existingSnapshot);
		// } else {
		// 	// First time loading or empty board, deserialize the full snapshot
		// 	board.deserialize(snapshot);
		// 	log.setSnapshotLastIndex(snapshot.lastIndex);
		// }
		// TODO set set snapshot last index
		board.deserializeHTML(snapshot);
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
			lastIndex = log.getLastIndex();
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
		if (newerEvents.length <= 0) {
			return;
		}
		log.insertEvents(newerEvents);
		const last = log.getLastConfirmed();
		if (last) {
			subject.publish(last);
		}
		lastIndex = log.getLastIndex();
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
		if (pendingEvent) {
			return;
		}
		const unpublishedEvent = log.getUnpublishedEvent();
		if (!unpublishedEvent) {
			return;
		}
		sendBoardEvent(
			board.getBoardId(),
			unpublishedEvent,
			currentSequenceNumber,
		);
	}

	function tryResendEvent(): void {
		if (!pendingEvent) {
			return;
		}
		const date = Date.now();
		const isTimeToSendPendingEvent =
			date - pendingEvent.lastSentTime >= RESEND_INTERVAL;
		if (!isTimeToSendPendingEvent) {
			return;
		}
		const isProbablyLostConnection =
			firstSentTime && date - firstSentTime >= RESEND_INTERVAL * 5;
		if (isProbablyLostConnection) {
			board.presence.clear();
			connection?.notifyAboutLostConnection();
		}

		sendBoardEvent(
			board.getBoardId(),
			pendingEvent.event,
			currentSequenceNumber,
		);
	}

	function handleConfirmation(msg: ConfirmationMsg): void {
		if (!pendingEvent) {
			return;
		}
		const isPendingEventConfirmation =
			pendingEvent.sequenceNumber === msg.sequenceNumber;
		if (!isPendingEventConfirmation) {
			return;
		}
		connection?.dismissNotificationAboutLostConnection();
		currentSequenceNumber++;
		pendingEvent.event.order = msg.order;
		log.confirmEvent(pendingEvent.event);
		subject.publish({} as any);
		pendingEvent = null;
		firstSentTime = null;
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
				lastKnownOrder: log.getLastIndex(),
			},
		};
		connection?.publishBoardEvent(boardId, toSend, sequenceNumber);

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
		connection?.publishPresenceEvent(board.getBoardId(), event);
	}

	// Window Smell: move to connection
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
		return connection?.connectionId || 0;
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

	async function replay(): Promise<void> {
		try {
			// Create a file input element
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json";

			// Create a promise to handle the file selection
			const fileSelectedPromise = new Promise<File>((resolve, reject) => {
				fileInput.onchange = event => {
					const files = (event.target as HTMLInputElement).files;
					if (files && files.length > 0) {
						resolve(files[0]);
					} else {
						reject(new Error("No file selected"));
					}
				};
			});

			// Trigger file selection dialog
			fileInput.click();

			// Wait for file selection
			const file = await fileSelectedPromise;

			// Read the file content
			const fileContent = await file.text();

			// Parse JSON
			const events: SyncBoardEvent[] = JSON.parse(fileContent);

			// Validate that the content is an array
			if (!Array.isArray(events)) {
				throw new Error(
					"Selected file does not contain a valid array of events",
				);
			}

			// Call the log's replay method
			log.replay(events);

			// Notify user
			notify({
				header:
					i18n.t("events.replaySuccessful.header") ||
					"Replay Successful",
				body:
					i18n.t("events.replaySuccessful.body") ||
					`Successfully replayed ${events.length} events`,
				variant: "success",
				duration: 3000,
			});

			// Update the UI
			subject.publish({} as any);
		} catch (error) {
			console.error("Failed to replay events:", error);
			notify({
				header: i18n.t("events.replayFailed.header") || "Replay Failed",
				body:
					i18n.t("events.replayFailed.body") ||
					"Failed to replay events from file",
				variant: "error",
				duration: 5000,
			});
		}
	}

	const instance: Events = {
		subject,
		serialize: log.serialize,
		deserialize: log.deserialize,
		deserializeAndApply: log.deserializeAndApply,
		getSnapshot: log.getSnapshot,
		getSnapshotToPublish,
		getRaw,
		getSyncLog: log.getSyncLog,
		syncLogSubject: log.syncLogSubject,
		getAll: () => log.getList().map(record => record.event),
		getLastIndex: log.getLastIndex,
		disconnect,
		emit,
		emitAndApply,
		apply,
		undo,
		redo,
		canUndo,
		canRedo,
		getSaveFileTimeout: () => saveFileTimeout,
		sendPresenceEvent,
		replay,
		handleEvent: messageRouter.handleMessage,
	};

	connection?.subscribe(board);

	return instance;
}
