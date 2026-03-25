import { Board } from "Board";
import { EventsMsg, WireBoardSubscriptionCompletedMsg } from "./boardMessageInterface";
import { safeParseSocketMsg } from "./socketContract";

type RoutedMessage = EventsMsg | WireBoardSubscriptionCompletedMsg;

type MessageHandler<T extends RoutedMessage = RoutedMessage> = (
	message: T,
	board: Board,
) => void;

export interface MessageRouter {
	addHandler: <T extends RoutedMessage>(
		type: string,
		handler: MessageHandler<T>,
	) => void;
	handleMessage: (message: unknown, board: Board) => void;
}

export function createMessageRouter(): MessageRouter {
	const handlers: Map<string, MessageHandler> = new Map();

	function addHandler<T extends RoutedMessage>(
		type: string,
		handler: MessageHandler<T>,
	): void {
		handlers.set(type, (message: RoutedMessage, board: Board) => {
			if (message.type === type) {
				(handler as MessageHandler<typeof message>)(message, board);
			}
		});
	}

	function handleMessage(message: unknown, board: Board): void {
		const parsed = safeParseSocketMsg(message);
		if (!parsed.success) {
			console.warn("Invalid socket message received", parsed.error.flatten());
			return;
		}

		const socketMessage = parsed.data;
		if (
			socketMessage.type !== "BoardEvent" &&
			socketMessage.type !== "BoardSubscriptionCompleted" &&
			socketMessage.type !== "Confirmation" &&
			socketMessage.type !== "CreateSnapshotRequest" &&
			socketMessage.type !== "AiChat" &&
			socketMessage.type !== "Mode" &&
			socketMessage.type !== "PresenceEvent" &&
			socketMessage.type !== "UserJoin"
		) {
			console.warn(`Unhandled message type: ${socketMessage.type}`);
			return;
		}

		const handler = handlers.get(socketMessage.type);
		if (handler) {
			handler(socketMessage as RoutedMessage, board);
		} else {
			console.warn(`Unhandled message type: ${socketMessage.type}`);
		}
	}

	return { addHandler, handleMessage };
}
