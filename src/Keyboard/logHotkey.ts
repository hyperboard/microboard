import type { SelectionContext } from "Board/Selection/Selection";
import { getHotkeyLabel } from "./getHotkeyLabel";
import type { HotkeyName } from "./types";

type HotkeyStatus =
	| "triggered"
	| "canceledBySingleItemOnly"
	| "canceledBySelectionContext";

export function logHotkey(
	hotkey: HotkeyName,
	status: Exclude<HotkeyStatus, "canceledBySelectionContext">,
): void;
export function logHotkey(
	hotkey: HotkeyName,
	status: "canceledBySelectionContext",
	context: SelectionContext,
	neededContext: SelectionContext[],
): void;
export function logHotkey(
	hotkey: HotkeyName,
	status: HotkeyStatus,
	context?: SelectionContext,
	neededContext?: SelectionContext[],
): void {
	if (!import.meta.env.LOG_HOTKEYS) {
		return;
	}

	switch (status) {
		case "triggered":
			console.log(
				`Triggered hotkey ${hotkey} (${getHotkeyLabel(hotkey)})`,
			);
			break;
		case "canceledBySingleItemOnly":
			console.log(
				`Hotkey ${hotkey} (${getHotkeyLabel(
					hotkey,
				)}) canceled because selected more than one item.`,
			);
			break;
		case "canceledBySelectionContext":
			console.log(
				`Hotkey ${hotkey} (${getHotkeyLabel(
					hotkey,
				)}) canceled because of selection context.\nCurrent: ${context}; Needed: ${neededContext?.join(
					", ",
				)}`,
			);
			break;
	}
}
