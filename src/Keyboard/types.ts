import type { SelectionContext } from "Selection/Selection";
import hotkeys from "hotkeys.json"; // Smell View from Board

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

export type HotkeyCb = (event?: KeyboardEvent) => void;
export type HotkeyConfig = {
  cb: HotkeyCb;
  selectionContext?: SelectionContext[];
  preventDefault?: boolean;
  singleItemOnly?: boolean;
  allItemsType?: string[];
};

export type HotkeysMap = Partial<Record<HotkeyName, HotkeyCb | HotkeyConfig>>;
