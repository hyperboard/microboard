import { Board } from "Board/Board";
import {
	calculateAudioPosition,
	prepareAudio,
} from "Board/Items/Audio/AudioHelpers";
import { AudioItem } from "Board/Items/Audio/Audio";
import { NotifyFunction } from "shared/ui-lib/Toast/notify";
import { conf } from "Board/Settings";

export function uploadAudio(
	file: File,
	board: Board,
	notify: NotifyFunction,
	extension: string,
	accessToken: string | null,
) {
	const notificationId = notify({
		variant: "info",
		header: conf.i18n.t("toolsPanel.addMedia.loading"),
		body: "",
		duration: 100_000,
		loader: "MediaLoader",
	});

	const audio = new AudioItem(
		board,
		true,
		undefined,
		board.events,
		"",
		extension,
	);
	const { scaleX, scaleY, translateX, translateY } = calculateAudioPosition(
		board,
		audio,
	);
	audio.transformation.applyTranslateTo(translateX, translateY);
	audio.transformation.applyScaleTo(scaleX, scaleY);
	audio.updateMbr();
	const boardAudio = board.add(audio);
	board.selection.removeAll();
	board.selection.add(boardAudio);

	prepareAudio(file, accessToken, board.getBoardId())
		.then(url => {
			boardAudio.setUrl(url);
		})
		.catch(er => {
			console.error("Could not create audio:", er);
		})
		.finally(() => conf.disMissNotification(notificationId));
}
