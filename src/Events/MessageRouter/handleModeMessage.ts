import { Board } from "Board";
import { conf } from "Settings";

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

/** Default value is returned if did not find such param */
function getBooleanParam(searchParam: string, defaultValue: boolean): boolean {
  const param = new URLSearchParams(window.location.search).get(searchParam);
  if (!param) {
    return defaultValue;
  }
  return param === "true" ? true : false;
}

type PanelType = "titlePanel" | "userPanel";
/** Tries to find panel in search param, returns default value if not found */
export function shouldShow(panel: PanelType): boolean {
  return getBooleanParam(panel, true);
}

export function isTemplateView(): boolean {
  return getBooleanParam("isTemplateView", false);
}
