import { PresenceEventMsg, UserJoinMsg } from "Board/Presence/Events";
import { createMessageRouter } from "./createMessageRouter";
import { AiChatMsg, handleAiChatMassage } from "./handleAiChatMassage";
import {
	BoardEventMsg,
	handleBoardEventMessage,
} from "./handleBoardEventMessage";
import { handleBoardSubscriptionCompletedMsg } from "./handleBoardSubscriptionCompletedMsg";
import { ConfirmationMsg, handleConfirmation } from "./handleConfirmation";
import {
	SnapshotRequestMsg,
	handleCreateSnapshotRequestMessage,
} from "./handleCreateSnapshotRequestMessage";
import { ModeMsg, handleModeMessage } from "./handleModeMessage";
import {
	handlePresenceEventMessage,
	handleUserJoinMessage,
} from "./handlePresenceEventMessage";

export const messageRouter = createMessageRouter();

messageRouter.addHandler<BoardEventMsg>("BoardEvent", handleBoardEventMessage);
messageRouter.addHandler(
	"BoardSubscriptionCompleted",
	handleBoardSubscriptionCompletedMsg,
);
messageRouter.addHandler<ConfirmationMsg>("Confirmation", handleConfirmation);

messageRouter.addHandler<SnapshotRequestMsg>(
	"CreateSnapshotRequest",
	handleCreateSnapshotRequestMessage,
);
messageRouter.addHandler<AiChatMsg>("AiChat", handleAiChatMassage);
messageRouter.addHandler<ModeMsg>("Mode", handleModeMessage);
messageRouter.addHandler<PresenceEventMsg>(
	"PresenceEvent",
	handlePresenceEventMessage,
);
messageRouter.addHandler<UserJoinMsg>("UserJoin", handleUserJoinMessage);
