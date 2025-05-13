import { HistoryRecord } from "./EventsLog";

export function shouldSkipEvent(
	record: HistoryRecord,
	userId: number,
): boolean {
	const { operation } = record.event.body;
	return (
		record.event.body.userId !== userId ||
		operation.method === "updateVideoData" ||
		(operation.class === "Audio" && operation.method === "setUrl")
	);
}
