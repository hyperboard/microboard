import { Board } from "Board/Board";
import { VideoItem } from "./Video";
import { calculatePosition } from "../Image/calculatePosition";
import { prepareVideo } from "./VideoHelpers";
import { NotifyFunction } from "shared/ui-lib/Toast/notify";

export function uploadVideo(
	file: File,
	board: Board,
	notify: NotifyFunction,
	extension: "mp4" | "webm",
	accessToken: string | null,
) {
	prepareVideo(file, accessToken)
		.then(videoData => {
			const video = new VideoItem(
				videoData,
				board,
				board.events,
				"",
				extension,
			);
			video.doOnceBeforeOnLoad(() => {
				const { scaleX, scaleY, translateX, translateY } =
					calculatePosition(video, board);
				video.transformation.applyTranslateTo(translateX, translateY);
				video.transformation.applyScaleTo(scaleX, scaleY);
				video.updateMbr();
				const boardVideo = board.add(video);
				board.selection.removeAll();
				board.selection.add(boardVideo);
			});
		})
		.catch(er => {
			console.error("Could not create video:", er);
		});
}
