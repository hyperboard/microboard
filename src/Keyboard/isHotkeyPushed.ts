import type { Hotkey, HotkeyName } from './types';
import hotkeys from 'hotkeys.json';

export function isHotkeyPushed(hotkey: HotkeyName, event: KeyboardEvent): boolean {
	if (!hotkeys[hotkey]) {
		return false;
	}
	const { key } = hotkeys[hotkey] as Hotkey;
	const isControlPushed = event.ctrlKey || event.metaKey;
	const isShiftPushed = event.shiftKey;
	const isAltPushed = event.altKey;
	let isPushed =
		(Array.isArray(key.button) ? key.button.includes(event.code) : key.button === event.code) &&
		(!key.ctrl || isControlPushed) &&
		(!key.alt || isAltPushed) &&
		(!key.shift || isShiftPushed);
	if (
		(!key.ctrl && isControlPushed) ||
		(!key.alt && isAltPushed) ||
		(!key.shift && isShiftPushed)
	) {
		isPushed = false;
	}

	return isPushed;
}
