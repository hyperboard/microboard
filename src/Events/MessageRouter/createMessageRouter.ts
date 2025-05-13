import { EventsMsg } from "App/Connection";
import { Board } from "Board";

type MessageHandler<T extends EventsMsg = EventsMsg> = (
	message: T,
	board: Board,
) => void;

export interface MessageRouter {
	addHandler: <T extends EventsMsg>(
		type: string,
		handler: MessageHandler<T>,
	) => void;
	handleMessage: (message: EventsMsg, board: Board) => void;
}

export function createMessageRouter(): MessageRouter {
	const handlers: Map<string, MessageHandler> = new Map();

	function addHandler<T extends EventsMsg>(
		type: string,
		handler: MessageHandler<T>,
	): void {
		handlers.set(type, (message: EventsMsg, board: Board) => {
			if (message.type === type) {
				(handler as MessageHandler<typeof message>)(message, board);
			}
		});
	}

	function handleMessage(message: EventsMsg, board: Board): void {
		const handler = handlers.get(message.type);
		if (handler) {
			handler(message, board);
		} else {
			console.warn(`Unhandled message type: ${message.type}`);
		}
	}

	return { addHandler, handleMessage };
}
