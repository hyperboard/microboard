import { Board, BoardSnapshot } from "Board";
import { SyncBoardEventPack, SyncEvent } from "../Events";
import { PresenceEventType, PresenceUser } from "Presence/Events";
import { AiChatEventType } from "./handleAiChatMassage";

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
	snapshot?: string | null;
	JSONSnapshot?: BoardSnapshot | null;
	eventsSinceLastSnapshot: SyncBoardEventPack[];
	initialSequenceNumber: number;
}

export interface BoardSnapshotMsg {
	type: "BoardSnapshot";
	boardId: string;
	snapshot: string;
	lastEventOrder: number;
}

export interface AiChatMsg<T = AiChatEventType> {
	type: 'AiChat';
	boardId: string;
	event: T;
}

export interface BoardEventMsg {
	type: "BoardEvent";
	boardId: string;
	event: SyncEvent;
	sequenceNumber: number;
	userId: string;
}

export interface ConfirmationMsg {
	type: 'Confirmation';
	boardId: string;
	sequenceNumber: number;
	order: number;
}

export interface ModeMsg {
	type: 'Mode';
	boardId: string;
	mode: 'view' | 'edit';
}

export interface SnapshotRequestMsg {
	type: 'CreateSnapshotRequest';
	boardId: string;
}

export interface UserJoinMsg {
	type: "UserJoin";
	timestamp: number;
	userId: number;
	boardId: string;
	snapshots: Record<string, PresenceUser>;
}

export interface PresenceEventMsg<T = PresenceEventType> {
	type: "PresenceEvent";
	boardId: string;
	event: T;
	userId: string;
	softId: string | null;
	hardId: string | null;
	messageId: string;
	nickname: string;
	color: string | null;
	avatar: string | null;
}

export type EventsMsg =
	| ModeMsg
	| BoardEventMsg
	| SnapshotRequestMsg
	| ConfirmationMsg
	| BoardSubscriptionCompletedMsg
	| UserJoinMsg
	| PresenceEventMsg
	| AiChatMsg
	| BoardSnapshotMsg;

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
