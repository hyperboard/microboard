import { Board } from "Board/Board";
import { VideoItem } from "./Video";
import { calculatePosition } from "../Image/calculatePosition";
import { prepareVideo } from "./VideoHelpers";
import { NotifyFunction } from "Board/Events/Events";
import { t } from "i18next";

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
			notify({
				variant: "error",
				header: t("video.error.header"),
				body: er.message || "",
				duration: 5000,
			});
			console.error("Could not create video:", er);
		});
}
