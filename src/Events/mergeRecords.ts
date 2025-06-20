import type { HistoryRecord } from "./Log";
import { mergeOperations } from "./Merge";

export function mergeRecords(records: HistoryRecord[]): HistoryRecord[] {
	if (records.length < 2) {
		return records;
	}

	const mergedRecords: HistoryRecord[] = [];
	let previous: HistoryRecord | null = null;

	for (const record of records) {
		if (!previous) {
			previous = record;
			continue;
		}

		const mergedEventOperation = mergeOperations(
			previous.event.body.operation,
			record.event.body.operation,
		);

		if (!mergedEventOperation) {
			mergedRecords.push(previous);
			previous = record;
		} else {
			const mergedCommand = record.command.merge
				? previous.command.merge(mergedEventOperation)
				: previous.command;

			previous = {
				event: {
					...record.event,
					body: {
						...record.event.body,
						operation: mergedEventOperation,
					},
				},
				command: mergedCommand,
			};
		}
	}

	if (previous) {
		mergedRecords.push(previous);
	}

	return mergedRecords;
}
