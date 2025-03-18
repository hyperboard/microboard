import { VideoConstructorData } from "./Video";

interface VideoBaseOp {
	class: "Video";
	item: string[];
}

interface UpdateVideoData extends VideoBaseOp {
	method: "updateVideoData";
	data: VideoConstructorData;
}

export type VideoOperation = UpdateVideoData;
