// import { isEditInProcess } from "Board/Items/RichText/RichText";
import type { Board } from "Board/Board";
import { isHotkeyPushed } from "./isHotkeyPushed";
import { logHotkey } from "./logHotkey";
import type { HotkeyName, HotkeysMap } from "./types";

export function checkHotkeys(
	hotkeyMap: HotkeysMap,
	event: KeyboardEvent,
	board: Board,
) {
	const entries = Object.entries(hotkeyMap);
	for (const [hotkey, configOrCb] of entries) {
		if (isHotkeyPushed(hotkey as HotkeyName, event)) {
			if (typeof configOrCb === "function") {
				event.preventDefault();
				configOrCb(event);
				logHotkey(hotkey as HotkeyName, "triggered");
				return true;
			}
			const {
				preventDefault = true,
				selectionContext,
				singleItemOnly = false,
				cb,
			} = configOrCb;

			const context = board.selection.getContext();
			const isSingle = board.selection.items.isSingle();
			if (singleItemOnly && !isSingle) {
				logHotkey(hotkey as HotkeyName, "canceledBySingleItemOnly");
				return false;
			}
			if (
				selectionContext?.length &&
				!selectionContext.includes(context)
			) {
				logHotkey(
					hotkey as HotkeyName,
					"canceledBySelectionContext",
					context,
					selectionContext,
				);
				return false;
			}

			if (preventDefault) {
				event.preventDefault();
			}
			cb(event);
			logHotkey(hotkey as HotkeyName, "triggered");
			return true;
		}
	}

	return false;
}
