import hotkeys from 'hotkeys.json'; // Smell View from Board
import type { Hotkey, HotkeyName } from './types';
import { isMacos } from 'isMacos';

export function getHotkeyLabel(hotkey: HotkeyName) {
	const hotkeyLabel = (hotkeys[hotkey] as Hotkey).label;
	switch (import.meta.env.FORCE_HOTKEYS || 'auto') {
		case 'windows':
			return hotkeyLabel.windows;
		case 'macos':
			return hotkeyLabel.mac;
		default:
			if (isMacos()) {
				return hotkeyLabel.mac;
			}
			return hotkeyLabel.windows;
	}
}
