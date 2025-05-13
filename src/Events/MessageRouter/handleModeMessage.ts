import { Board } from "Board";
import { conf } from "Board/Settings";
import { isTemplateView } from "shared/lib/queryStringParser";

export type ViewMode = "view" | "edit" | "loading";

export interface ModeMsg {
	type: "Mode";
	boardId: string;
	mode: ViewMode;
}

export function handleModeMessage(message: ModeMsg, board: Board): void {
	if (board.getInterfaceType() !== message.mode) {
		board.setInterfaceType(message.mode);
		if (isTemplateView()) {
			return;
		}
		conf.notify({
			header: conf.i18n.t("sharing.settingsChanged.heading"),
			body:
				message.mode === "edit"
					? conf.i18n.t("sharing.settingsChanged.bodyEdit")
					: conf.i18n.t("sharing.settingsChanged.bodyView"),
			duration: 5000,
		});
	}
}
