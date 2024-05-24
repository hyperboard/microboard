import type { SelectionContext } from "Board/Selection/Selection";
import hotkeys from "View/hotkeys.json";

export type Hotkey = {
	key: {
		button: string | string[];
		ctrl?: boolean;
		alt?: boolean;
		shift?: boolean;
	};
	label: { windows: string; mac: string };
};

export type HotkeyName = keyof typeof hotkeys;

type HotkeyCb = (event?: KeyboardEvent) => void;
type HotkeyConfig = {
	cb: HotkeyCb;
	selectionContext?: SelectionContext[];
	preventDefault?: boolean;
	singleItemOnly?: boolean;
};

export type HotkeysMap = Partial<Record<HotkeyName, HotkeyCb | HotkeyConfig>>;
