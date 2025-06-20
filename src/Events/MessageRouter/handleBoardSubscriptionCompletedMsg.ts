import { Board } from 'Board';
import { BoardEventPack, SyncBoardEvent, SyncEvent } from '../Events';
import { conf } from 'Settings';
import { BoardSubscriptionCompletedMsg } from './boardMessageInterface';

export function handleBoardSubscriptionCompletedMsg(
	msg: BoardSubscriptionCompletedMsg,
	board: Board
): void {
	const { log } = board.events;
	handleSeqNumApplication(msg.initialSequenceNumber, board);
	if (msg.snapshot) {
		handleSnapshotApplication(msg.snapshot, board);
		log.list.clearConfirmedRecords();
	}
	handleBoardEventListApplication(msg.eventsSinceLastSnapshot, board);
	board.setInterfaceType(msg.mode);
	onBoardLoad(board);
}

export function handleSeqNumApplication(initialSequenceNumber: number, board: Board): void {
	const { log } = board.events;
	log.currentSequenceNumber = initialSequenceNumber;
	if (log.pendingEvent) {
		log.pendingEvent.sequenceNumber = log.currentSequenceNumber;
	}
	startIntervals(board);
}

export function startIntervals(board: Board): void {
	const { log } = board.events;

	if (log.publishIntervalTimer) {
		clearInterval(log.publishIntervalTimer);
	}
	if (log.resendIntervalTimer) {
		clearInterval(log.resendIntervalTimer);
	}

	log.publishIntervalTimer = setInterval(() => {
		tryPublishEvent(board);
	}, conf.EVENTS_PUBLISH_INTERVAL);
	log.resendIntervalTimer = setInterval(() => {
		tryResendEvent(board);
	}, conf.EVENTS_RESEND_INTERVAL);
}

function tryPublishEvent(board: Board): void {
	const { log } = board.events;

	if (log.pendingEvent) {
		return;
	}
	const unpublishedEvent = log.getUnpublishedEvent();
	if (!unpublishedEvent) {
		return;
	}
	sendBoardEvent(board, unpublishedEvent, log.currentSequenceNumber);
}

function tryResendEvent(board: Board): void {
	const { log } = board.events;

	if (!log.pendingEvent) {
		return;
	}
	const date = Date.now();
	const isTimeToSendPendingEvent =
		date - log.pendingEvent.lastSentTime >= conf.EVENTS_RESEND_INTERVAL;
	if (!isTimeToSendPendingEvent) {
		return;
	}
	const isProbablyLostConnection =
		log.firstSentTime && date - log.firstSentTime >= conf.EVENTS_RESEND_INTERVAL * 5;
	if (isProbablyLostConnection) {
		board.presence.clear();
		conf.connection?.notifyAboutLostConnection();
	}

	sendBoardEvent(board, log.pendingEvent.event, log.currentSequenceNumber);
}

function stopIntervals(board: Board): void {
	const { log } = board.events;

	if (log.publishIntervalTimer) {
		clearInterval(log.publishIntervalTimer);
		log.publishIntervalTimer = null;
	}
	if (log.resendIntervalTimer) {
		clearInterval(log.resendIntervalTimer);
		log.resendIntervalTimer = null;
	}
}

function handleSnapshotApplication(snapshot: string, board: Board): void {
	const { log } = board.events;
	board.deserializeHTML(snapshot);
	const match = snapshot.match(/last-event-order" content="(\d+)"/);
	if (match && match[1]) {
		log.list.setSnapshotLastIndex(Number(match[1]));
	}
}

function handleBoardEventListApplication(events: SyncBoardEvent[], board: Board): void {
	const { log } = board.events;

	const existinglist = log.list.getAllRecords();

	const maxOrder = Math.max(...existinglist.map(record => record.event.order));

	const newEvents = events.filter(event => event.order > maxOrder);

	if (newEvents.length > 0) {
		log.insertEventsFromOtherConnections(newEvents);
		board.events.subject.publish(newEvents[0]);
	}
}

function sendBoardEvent(board: Board, event: BoardEventPack, sequenceNumber: number): void {
	const { log } = board.events;

	const toSend: SyncEvent = {
		...event,
		body: {
			...event.body,
			lastKnownOrder: log.getLastIndex(),
		},
	};
	conf.connection.send({
		type: 'BoardEvent',
		boardId: board.getBoardId(),
		event: toSend,
		sequenceNumber,
		userId: conf.connection.getCurrentUser(),
	});

	const date = Date.now();
	log.pendingEvent = {
		event: toSend,
		sequenceNumber,
		lastSentTime: date,
	};
	if (!log.firstSentTime) {
		log.firstSentTime = date;
	}
}

export function onBoardLoad(board: Board): void {
	const searchParams = new URLSearchParams(window.location.search.slice(1));
	const toFocusId = searchParams.get('focus') ?? '';
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
	const isItemsOutOfView = board.items.getItemsInView().length === 0 || !cameraSnapshot;

	if (isItemsOutOfView && hasItemsInBoard) {
		board.camera.zoomToFit(board.items.getMbr());
	}

	if (!hasItemsInBoard) {
		board.camera.zoomToViewCenter(1);
	}

	board.camera.setBoardId(board.getBoardId());
}
