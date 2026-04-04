import type { ItemActionConfig } from "./ItemActions";

/**
 * Registry of item action configs, keyed by itemType.
 * Populated lazily during `registerItem(...)` calls.
 *
 * Usage in UI repo:
 *   import { itemActions } from "microboard";
 *   const config = itemActions[item.itemType];
 *   // render config.contextPanel, config.contextMenu, config.toolButton
 */
export const itemActions: Record<string, ItemActionConfig> = {};
