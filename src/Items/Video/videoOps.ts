import { VideoItem, Dimension } from "./Video";
import { VideoOperation } from "./VideoOperation";

export const videoOps = {
	updateVideoData: (
		items: VideoItem[],
		data: { previewUrl: string; url: string; videoDimension: Dimension }
	): VideoOperation => ({
		class: "Video",
		method: "updateVideoData",
		item: items.map(i => i.getId()),
		data,
	}),
};
