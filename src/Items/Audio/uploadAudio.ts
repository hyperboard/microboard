import { Board } from "Board/Board";
import { NotifyFunction } from "Board/Events/Events";
import { t } from "i18next";
import {
	calculateAudioPosition,
	prepareAudio,
} from "Board/Items/Audio/AudioHelpers";
import { AudioItem } from "Board/Items/Audio/Audio";

export function uploadAudio(
	file: File,
	board: Board,
	notify: NotifyFunction,
	extension: "mp3" | "wav",
) {
	prepareAudio(file)
		.then(url => {
			const audio = new AudioItem(
				url,
				board,
				board.events,
				"",
				extension,
			);
			const { scaleX, scaleY, translateX, translateY } =
				calculateAudioPosition(board, audio);
			audio.transformation.applyTranslateTo(translateX, translateY);
			audio.transformation.applyScaleTo(scaleX, scaleY);
			audio.updateMbr();
			const boardAudio = board.add(audio);
			board.selection.removeAll();
			board.selection.add(boardAudio);
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
