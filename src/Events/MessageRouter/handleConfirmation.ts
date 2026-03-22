import { Board } from 'Board';
import { conf } from 'Settings';
import { ConfirmationMsg } from './boardMessageInterface';

export function handleConfirmation(msg: ConfirmationMsg, board: Board): void {
	const { log } = board.events;

	if (!log.pendingEvent) {
		return;
	}
	const isPendingEventConfirmation = log.pendingEvent.sequenceNumber === msg.sequenceNumber;
	if (!isPendingEventConfirmation) {
		return;
	}
	conf.connection?.dismissNotificationAboutLostConnection();
	log.currentSequenceNumber++;
	log.pendingEvent.event.order = msg.order;
	log.confirmSentLocalEvent(log.pendingEvent.event);
	board.subject.publish();
	log.pendingEvent = null;
	log.firstSentTime = null;
}
