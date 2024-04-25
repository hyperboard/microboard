import { isMacos } from "App/isMacos";
import hotkeys from "View/hotkeys.json";

type Hotkey = {
	key: {
		button: string;
		ctrl?: boolean;
		alt?: boolean;
		shift?: boolean;
	};
	label: { windows: string; mac: string };
	preventDefault?: boolean;
};

type HotkeyName = keyof typeof hotkeys;

export function isHotkeyPushed(
	hotkey: HotkeyName,
	event: KeyboardEvent,
): boolean {
	const { key, preventDefault = true } = hotkeys[hotkey] as Hotkey;
	const isPushed =
		key.button === event.code &&
		(!key.alt || event.altKey) &&
		(!key.shift || event.shiftKey) &&
		(!key.ctrl || event.ctrlKey || event.metaKey);

	if (isPushed && preventDefault) {
		event.preventDefault();
	}
	return isPushed;
}

export function getHotkeyLabel(hotkey: HotkeyName) {
	if (isMacos()) {
		return (hotkeys[hotkey] as Hotkey).label.mac;
	}

	return (hotkeys[hotkey] as Hotkey).label.windows;
}
