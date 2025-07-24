import {type Hotkey, HotkeyConfig, HotkeysMap} from "./types";
import {Board} from "../Board";

export const editModeHotkeyRegistry: HotkeysMap = {};
export const viewModeHotkeyRegistry: HotkeysMap = {};
export const hotkeyNames: Record<string, Hotkey> = {}

type RegisterHotkeyArgs = {name: string, hotkey: Hotkey, hotkeyConfig: HotkeyConfig | ((event?: KeyboardEvent, board?: Board) => void), boardMode: "view" | "edit"}

export function registerHotkey({name, hotkey, hotkeyConfig, boardMode}: RegisterHotkeyArgs) {
  if (boardMode === "edit") {
    editModeHotkeyRegistry[name] = hotkeyConfig;
  } else {
    viewModeHotkeyRegistry[name] = hotkeyConfig;
  }
  hotkeyNames[name] = hotkey;
}
