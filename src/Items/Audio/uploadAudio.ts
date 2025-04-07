import { Board } from "Board/Board";
import {
	calculateAudioPosition,
	prepareAudio,
} from "Board/Items/Audio/AudioHelpers";
import { AudioItem } from "Board/Items/Audio/Audio";
import { NotifyFunction } from "shared/ui-lib/Toast/notify";

export function uploadAudio(
	file: File,
	board: Board,
	notify: NotifyFunction,
	extension: string,
	accessToken: string | null,
) {
	prepareAudio(file, accessToken)
		.then(url => {
			const audio = new AudioItem(
				url,
				board,
				true,
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
			console.error("Could not create audio:", er);
		});
}
