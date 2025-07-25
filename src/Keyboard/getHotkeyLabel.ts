import type { Hotkey, HotkeyName } from "./types";
import { isMacos } from "isMacos";
import { conf } from "Settings";
import hotkeysJson from "../hotkeys.json";
import {hotkeyNames} from "./HotkeyRegistry";

export function getHotkeyLabel(hotkey: HotkeyName) {
  const hotkeys = {...hotkeysJson, ...hotkeyNames}
  const hotkeyLabel = (hotkeys[hotkey] as Hotkey).label;
  switch (conf.FORCE_HOTKEYS || "auto") {
    case "windows":
      return hotkeyLabel.windows;
    case "macos":
      return hotkeyLabel.mac;
    default:
      if (isMacos()) {
        return hotkeyLabel.mac;
      }
      return hotkeyLabel.windows;
  }
}
