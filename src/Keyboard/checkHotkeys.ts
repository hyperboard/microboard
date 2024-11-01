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
			const context = board.selection.getContext();

			if (typeof configOrCb === "function") {
				event.preventDefault();
				configOrCb(event);
				logHotkey(
					configOrCb,
					hotkey as HotkeyName,
					"triggered",
					context,
				);
				return true;
			}
			const {
				preventDefault = true,
				selectionContext,
				singleItemOnly = false,
				allItemsType,
				cb,
			} = configOrCb;

			const isSingle = board.selection.items.isSingle();

			if (
				allItemsType?.length &&
				!allItemsType.some(itemType =>
					board.selection.items.isAllItemsType(
						itemType as
							| "Shape"
							| "Sticker"
							| "Frame"
							| "Connector"
							| "Image"
							| "RichText"
							| "Drawing"
							| "Eraser",
					),
				)
			) {
				logHotkey(
					configOrCb,
					hotkey as HotkeyName,
					"canceledByAllItemsType",
					context,
				);
				return false;
			}

			if (singleItemOnly && !isSingle) {
				logHotkey(
					configOrCb,
					hotkey as HotkeyName,
					"canceledBySingleItemOnly",
					context,
				);
				return false;
			}
			if (
				selectionContext?.length &&
				!selectionContext.includes(context)
			) {
				logHotkey(
					configOrCb,
					hotkey as HotkeyName,
					"canceledBySelectionContext",
					context,
				);
				return false;
			}

			if (preventDefault) {
				event.preventDefault();
			}
			cb(event);
			logHotkey(configOrCb, hotkey as HotkeyName, "triggered", context);
			return true;
		}
	}

	return false;
}
