import { Command, Operation } from "Board/Events";
import { VideoItem } from "./Video";

export class VideoCommand implements Command {
	constructor(
		private videos: VideoItem[],
		private operation: Operation,
	) {}

	apply(): void {
		for (const video of this.videos) {
			video.apply(this.operation);
		}
	}

	revert(): void {
		// Implement revert logic if needed
	}
}
