import {
	AiChatMsg,
	BoardEventMsg,
	WireBoardSubscriptionCompletedMsg,
	ConfirmationMsg,
	ModeMsg,
	PresenceEventMsg,
	SnapshotRequestMsg,
	UserJoinMsg
} from './boardMessageInterface';
import { createMessageRouter } from './createMessageRouter';
import { handleAiChatMassage } from './handleAiChatMassage';
import { handleBoardEventMessage } from './handleBoardEventMessage';
import { handleBoardSubscriptionCompletedMsg } from './handleBoardSubscriptionCompletedMsg';
import { handleConfirmation } from './handleConfirmation';
import { handleCreateSnapshotRequestMessage } from './handleCreateSnapshotRequestMessage';
import { handleModeMessage } from './handleModeMessage';
import { handlePresenceEventMessage, handleUserJoinMessage } from './handlePresenceEventMessage';

export const messageRouter = createMessageRouter();

messageRouter.addHandler<BoardEventMsg>('BoardEvent', handleBoardEventMessage);
messageRouter.addHandler<WireBoardSubscriptionCompletedMsg>(
	'BoardSubscriptionCompleted',
	handleBoardSubscriptionCompletedMsg
);
messageRouter.addHandler<ConfirmationMsg>('Confirmation', handleConfirmation);

messageRouter.addHandler<SnapshotRequestMsg>(
	'CreateSnapshotRequest',
	handleCreateSnapshotRequestMessage
);
messageRouter.addHandler<AiChatMsg>('AiChat', handleAiChatMassage);
messageRouter.addHandler<ModeMsg>('Mode', handleModeMessage);
messageRouter.addHandler<PresenceEventMsg>('PresenceEvent', handlePresenceEventMessage);
messageRouter.addHandler<UserJoinMsg>('UserJoin', handleUserJoinMessage);
