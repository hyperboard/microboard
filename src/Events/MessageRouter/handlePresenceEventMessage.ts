import { Board } from "Board";
import { PresenceEventMsg, UserJoinMsg } from "Board/Presence/Events";

export function handlePresenceEventMessage(
	message: PresenceEventMsg,
	board: Board,
): void {
	board.presence.push(message);
}

export function handleUserJoinMessage(
	message: UserJoinMsg,
	board: Board,
): void {
	board.presence.join(message);
}
