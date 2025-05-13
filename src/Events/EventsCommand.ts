import { EventsOperation } from "./EventsOperations";
import { Command } from "./Command";
import { Board } from "Board";

export class EventsCommand implements Command {
	private reverse: EventsOperation;

	constructor(
		private board: Board,
		private operation: EventsOperation,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		const handler = EventsOperationHandlers[this.operation.method];
		if (handler) {
			handler(this.board, this.operation);
		}
	}

	revert(): void {
		const handler = EventsOperationHandlers[this.reverse.method];
		if (handler) {
			handler(this.board, this.reverse);
		}
	}

	getReverse(): EventsOperation {
		switch (this.operation.method) {
			case "undo":
				return {
					...this.operation,
					method: "redo",
				};
			case "redo":
				return {
					...this.operation,
					method: "undo",
				};
		}
	}
}

export const EventsOperationHandlers: Record<
	string,
	(board: Board, operation: EventsOperation) => void | false
> = {};

function addOperationHandler(
	method: string,
	handler: (board: Board, operation: EventsOperation) => void | false,
): void {
	EventsOperationHandlers[method] = handler;
}

function applyUndo(board: Board, operation: EventsOperation): void {
	const log = board.events.log;
	const record = log.getRecordById(operation.eventId);
	if (!record) {
		return;
	}
	if (record.event.body.operation.method === "undo") {
		record.command.apply();
	} else {
		record.command.revert();
	}
}

function applyRedo(board: Board, operation: EventsOperation): void {
	const log = board.events.log;
	const record = log.getRecordById(operation.eventId);
	if (!record) {
		return;
	}
	if (record.event.body.operation.method === "undo") {
		const undoable = log.getRecordById(record.event.body.operation.eventId);
		undoable?.command.apply();
	} else {
		record.command.apply();
	}
}

// Register the handlers
addOperationHandler("undo", applyUndo);
addOperationHandler("redo", applyRedo);
