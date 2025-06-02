import { Subject } from 'Subject';
import { HistoryRecord } from './EventsLog';

export interface SyncLogMsg {
	msg: 'addedNew' | 'confirmed' | 'toSend' | 'revertUnconfirmed' | 'applyUnconfirmed';
	records: HistoryRecord[];
}

export type SyncLog = SyncLogMsg[];
export type SyncLogSubject = Subject<SyncLog>;

export function createSyncLog(): {
	log: SyncLog;
	subject: SyncLogSubject;
} {
	const log: SyncLog = [];
	const subject = new Subject<SyncLog>();

	log.push = function (...msgs: SyncLogMsg[]): number {
		let newLength = log.length;
		for (const msg of msgs) {
			const lastItem = log[log.length - 1];
			if (lastItem && lastItem.msg === msg.msg) {
				lastItem.records = lastItem.records.concat(msg.records);
			} else {
				newLength = Array.prototype.push.call(log, msg);
			}
		}
		subject.publish(log);
		return newLength;
	};

	return {
		log,
		subject,
	};
}
