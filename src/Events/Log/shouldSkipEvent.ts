import { HistoryRecord } from "./EventsLog";
import { getBoardEventSessionId } from "../identity";

export function shouldSkipEvent(
	record: HistoryRecord,
	sessionIds: string[],
): boolean {
	const { operation } = record.event.body;
	const eventSessionId = getBoardEventSessionId(record.event.body);
	return (
		eventSessionId === undefined ||
		!sessionIds.includes(eventSessionId) ||
		operation.method === "updateVideoData" ||
		(operation.class === "Audio" && operation.method === "setUrl")
	);
}
