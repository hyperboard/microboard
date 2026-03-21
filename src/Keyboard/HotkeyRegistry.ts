import {type Hotkey, HotkeyConfig, HotkeysMap, HotkeyName} from "./types";
import {Board} from "../Board";

export const editModeHotkeyRegistry: HotkeysMap = {};
export const viewModeHotkeyRegistry: HotkeysMap = {};
export const hotkeyNames: Record<string, Hotkey> = {}

type RegisterHotkeyArgs = {name: string, hotkey: Hotkey, hotkeyConfig: HotkeyConfig | ((event?: KeyboardEvent, board?: Board) => void), boardMode: "view" | "edit"}

export function registerHotkey({name, hotkey, hotkeyConfig, boardMode}: RegisterHotkeyArgs) {
  if (boardMode === "edit") {
    editModeHotkeyRegistry[name as HotkeyName] = hotkeyConfig as any;
  } else {
    viewModeHotkeyRegistry[name as HotkeyName] = hotkeyConfig as any;
  }
  hotkeyNames[name] = hotkey;
}
