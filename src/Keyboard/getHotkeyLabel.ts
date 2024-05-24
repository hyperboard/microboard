import hotkeys from "View/hotkeys.json";
import type { Hotkey, HotkeyName } from "./types";
import { isMacos } from "App/isMacos";

export function getHotkeyLabel(hotkey: HotkeyName) {
	if (isMacos()) {
		return (hotkeys[hotkey] as Hotkey).label.mac;
	}

	return (hotkeys[hotkey] as Hotkey).label.windows;
}
