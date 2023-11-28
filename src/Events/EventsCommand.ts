import { Events } from "./Events";
import { EventsOperation } from "./EventsOperations";
import { Command } from "./Command";

export class EventsCommand implements Command {
	private reverse = this.getReverse();

	constructor(
		private eventsModule: Events,
		private operation: EventsOperation,
	) {}

	apply(): void {
		this.eventsModule.apply(this.operation);
	}

	revert(): void {
		this.eventsModule.apply(this.reverse);
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
