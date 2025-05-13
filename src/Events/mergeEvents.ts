import { BoardEvent } from "./Events";
import { mergeOperations } from "./Merge";

/**
 * Объединяет последовательность событий доски, сливая операции, где это возможно.
 *
 * @param events - Массив событий доски для объединения.
 * @returns Массив объединенных событий доски.
 *
 * Функция проходит по массиву событий и пытается объединить каждое событие
 * с предыдущим. Если операции событий можно объединить, создается новое
 * объединенное событие. Если нет, предыдущее событие добавляется к результату
 * без изменений. Эта функция помогает оптимизировать историю событий,
 * уменьшая количество отдельных операций там, где это возможно.
 */
// function mergeEvents(events: SyncBoardEvent[]): SyncBoardEvent[] {
export function mergeEvents(events: BoardEvent[]): BoardEvent[] {
	if (events.length < 2) {
		return events;
	}

	// const mergedEvents: SyncBoardEvent[] = [];
	// let previous: SyncBoardEvent | null = null;
	const mergedEvents: BoardEvent[] = [];
	let previous: BoardEvent | null = null;

	for (const event of events) {
		if (!previous) {
			previous = event;
			continue;
		}

		const mergedOperation = mergeOperations(
			previous.body.operation,
			event.body.operation,
		);

		if (!mergedOperation) {
			mergedEvents.push(previous);
			previous = event;
		} else {
			previous = {
				...event,
				body: {
					...event.body,
					operation: mergedOperation,
				},
			};
		}
	}

	if (previous) {
		mergedEvents.push(previous);
	}

	return mergedEvents;
}
