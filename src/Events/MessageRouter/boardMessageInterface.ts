import type { Board, BoardSnapshot } from "Board";
import type { SyncBoardEventPack, SyncEvent } from "../Events";
import type { PresenceEventType, PresenceUser } from "Presence/Events";
import type { AiChatEventType } from "./handleAiChatMassage";
import type {
	SocketContractAiChatMsg,
	SocketContractAuthConfirmationMsg,
	SocketContractAuthMsg,
	SocketContractBoardAccessDeniedMsg,
	SocketContractBoardConnectResponse,
	SocketContractBoardEventMsg,
	SocketContractNormalizedBoardSnapshot,
	SocketContractNormalizedBoardSubscriptionCompletedMsg,
	SocketContractBoardSnapshotMsg,
	SocketContractBoardSubscriptionCompletedMsg,
	SocketContractBoardWsHandshakeJwtPayload,
	SocketContractConfirmationMsg,
	SocketContractErrorMsg,
	SocketContractGetModeMsg,
	SocketContractInvalidateRightsMsg,
	SocketContractLogoutMsg,
	SocketContractModeMsg,
	SocketContractPingMsg,
	SocketContractPongMsg,
	SocketContractPresenceEventMsg,
	SocketContractSnapshotRequestMsg,
	SocketContractSubscribeMsg,
	SocketContractTemplateConnectResponse,
	SocketContractTemplateWsHandshakeJwtPayload,
	SocketContractUnsubscribeMsg,
	SocketContractUserJoinMsg,
	SocketContractVersionCheckMsg,
} from "./socketContract";

export type AuthMsg = SocketContractAuthMsg;
export type LogoutMsg = SocketContractLogoutMsg;
export type InvalidateRightsMsg = SocketContractInvalidateRightsMsg;
export type GetModeMsg = SocketContractGetModeMsg;
export type SubscribeMsg = SocketContractSubscribeMsg;
export type UnsubscribeMsg = SocketContractUnsubscribeMsg;
export type ErrorMsg = SocketContractErrorMsg;
export type VersionCheckMsg = SocketContractVersionCheckMsg;
export type AuthConfirmationMsg = SocketContractAuthConfirmationMsg;
export type PingMsg = SocketContractPingMsg;
export type PongMsg = SocketContractPongMsg;
export type BoardAccessDeniedMsg = SocketContractBoardAccessDeniedMsg;
export type BoardConnectResponse = SocketContractBoardConnectResponse;
export type TemplateConnectResponse = SocketContractTemplateConnectResponse;
export type BoardWsHandshakeJwtPayload =
	SocketContractBoardWsHandshakeJwtPayload;
export type TemplateWsHandshakeJwtPayload =
	SocketContractTemplateWsHandshakeJwtPayload;
export type BoardSubscriptionCompletedMsg = Omit<
	SocketContractNormalizedBoardSubscriptionCompletedMsg,
	"JSONSnapshot" | "eventsSinceLastSnapshot"
> & {
	mode: "view" | "edit";
	JSONSnapshot?: BoardSnapshot | null;
	eventsSinceLastSnapshot: SyncEvent[];
};
export type NormalizedBoardSnapshot = SocketContractNormalizedBoardSnapshot;
export type WireBoardSubscriptionCompletedMsg =
	SocketContractBoardSubscriptionCompletedMsg;
export type BoardSnapshotMsg = SocketContractBoardSnapshotMsg;
export type BoardEventMsg = Omit<SocketContractBoardEventMsg, "event"> & {
	event: SyncEvent;
};
export type ConfirmationMsg = SocketContractConfirmationMsg;
export type ModeMsg = SocketContractModeMsg;
export type SnapshotRequestMsg = SocketContractSnapshotRequestMsg;
export type UserJoinMsg = Omit<SocketContractUserJoinMsg, "snapshots"> & {
	snapshots: Record<string, PresenceUser>;
};
export type PresenceEventMsg<T = PresenceEventType> = Omit<
	SocketContractPresenceEventMsg,
	"event" | "userId" | "boardId"
> & {
	boardId: string;
	event: T;
	userId: string;
};
export type AiChatMsg<T = AiChatEventType> = Omit<
	SocketContractAiChatMsg,
	"event"
> & {
	event: T;
};
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
	| PingMsg
	| PongMsg
	| BoardAccessDeniedMsg;

type Subscription = {
	board: Board;
	publish: (message: EventsMsg) => void;
	subscribe: () => void;
	unsubscribe: () => void;
};
