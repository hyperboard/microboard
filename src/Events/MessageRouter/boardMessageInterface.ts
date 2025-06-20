import { AiChatMsg, Board, BoardEventMsg, ConfirmationMsg, ModeMsg, PresenceEventMsg, PresenceEventType, SnapshotRequestMsg, UserJoinMsg } from "index";
import { SyncBoardEventPack } from "Events/Events";

export interface AuthMsg {
	type: "Auth";
	jwt: string;
}

export interface LogoutMsg {
	type: "Logout";
}

export interface InvalidateRightsMsg {
	type: "InvalidateRights";
	boardId: string;
	byUser: boolean;
}

export interface GetModeMsg {
	type: "GetMode";
	boardId: string;
}

export interface SubscribeMsg {
	type: "Subscribe";
	boardId: string;
	userId: string;
	index: number;
	accessKey?: string;
}

export interface UnsubscribeMsg {
	type: "Unsubscribe";
	boardId: string;
}

export interface ErrorMsg {
	type: "Error";
	message: string;
	deniedBoardId?: string;
	expectedSequence?: number;
	receivedSequence?: number;
}

export interface VersionCheckMsg {
	type: "VersionCheck";
	version: string;
}

export interface AuthConfirmationMsg {
	type: "AuthConfirmation";
}

export interface PingMsg {
	type: "ping";
}

export interface BoardAccessDeniedMsg {
	type: "BoardAccessDenied";
	boardId: string;
}

export interface BoardSubscriptionCompletedMsg {
	type: "BoardSubscriptionCompleted";
	boardId: string;
	mode: "view" | "edit";
	snapshot: string | null;
	eventsSinceLastSnapshot: SyncBoardEventPack[];
	initialSequenceNumber: number;
}

export type EventsMsg =
	| ModeMsg
	| BoardEventMsg
	| SnapshotRequestMsg
	| ConfirmationMsg
	| BoardSubscriptionCompletedMsg
	| UserJoinMsg
	| PresenceEventMsg
	| AiChatMsg;

export type SocketMsg =
	| EventsMsg
	| AuthMsg
	| AuthConfirmationMsg
	| LogoutMsg
	| GetModeMsg
	| InvalidateRightsMsg
	| UserJoinMsg
	| SubscribeMsg
	| UnsubscribeMsg
	| VersionCheckMsg
	| ErrorMsg
	| ModeMsg
	| PingMsg
	| AiChatMsg
	| BoardAccessDeniedMsg;

type Subscription = {
	board: Board;
	publish: (message: EventsMsg) => void;
	subscribe: () => void;
	unsubscribe: () => void;
};