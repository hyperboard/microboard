import { Board } from 'Board';
import { isHotkeyPushed } from './isHotkeyPushed';
import { logHotkey } from './logHotkey';
import { HotkeysMap, HotkeyName } from './types';
import {editModeHotkeyRegistry, viewModeHotkeyRegistry} from "./HotkeyRegistry";

export function checkHotkeys(hotkeyMap: HotkeysMap, event: KeyboardEvent, board: Board) {
	const fullHotkeysMap = {...hotkeyMap, ...board.getInterfaceType() === "edit" ? editModeHotkeyRegistry : viewModeHotkeyRegistry}
	const entries = Object.entries(fullHotkeysMap);
	for (const [hotkey, configOrCb] of entries) {
		if (isHotkeyPushed(hotkey as HotkeyName, event)) {
			const context = board.selection.getContext();

			if (typeof configOrCb === 'function') {
				event.preventDefault();
				configOrCb(event, board);
				logHotkey(configOrCb, hotkey as HotkeyName, 'triggered', context);
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
							| 'Shape'
							| 'Sticker'
							| 'Frame'
							| 'Connector'
							| 'Image'
							| 'RichText'
							| 'Drawing'
							| 'Eraser'
					)
				)
			) {
				logHotkey(configOrCb, hotkey as HotkeyName, 'canceledByAllItemsType', context);
				return false;
			}

			if (singleItemOnly && !isSingle) {
				logHotkey(configOrCb, hotkey as HotkeyName, 'canceledBySingleItemOnly', context);
				return false;
			}
			if (selectionContext?.length && !selectionContext.includes(context)) {
				logHotkey(configOrCb, hotkey as HotkeyName, 'canceledBySelectionContext', context);
				return false;
			}

			if (preventDefault) {
				event.preventDefault();
			}
			cb(event, board);
			logHotkey(configOrCb, hotkey as HotkeyName, 'triggered', context);
			return true;
		}
	}

	return false;
}
