import { Command, Operation } from "Board/Events";
import { AudioItem } from "./Audio";

export class AudioCommand implements Command {
	constructor(
		private audios: AudioItem[],
		private operation: Operation,
	) {}

	apply(): void {
		for (const audio of this.audios) {
			audio.apply(this.operation);
		}
	}

	revert(): void {
		// Implement revert logic if needed
	}
}
