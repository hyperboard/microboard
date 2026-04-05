import type { BaseItem } from "Items/BaseItem/BaseItem";
import type { Tool } from "Tools/Tool";
import type {
  ItemOverlayDefinition,
  OverlayActionDefinition,
  OverlayOptionDefinition,
  SelectionOverlayActionDefinition,
  ToolOverlayDefinition,
} from "./OverlayMetadata";

export interface OverlayDynamicOptionsContext {
  item?: BaseItem;
  items?: readonly BaseItem[];
  tool?: Tool;
}

export type OverlayDynamicOptionsResolver = (
  context: OverlayDynamicOptionsContext,
) => OverlayOptionDefinition[];

export const itemOverlays: Record<string, ItemOverlayDefinition> = {};
export const toolOverlays: Record<string, ToolOverlayDefinition> = {};
export const dynamicOptionsResolvers: Record<string, OverlayDynamicOptionsResolver> = {};
export const selectionActions: Record<string, SelectionOverlayActionDefinition> = {};

export function registerItemOverlay(overlay: ItemOverlayDefinition): void {
  itemOverlays[overlay.itemType] = overlay;
}

export function registerToolOverlay(overlay: ToolOverlayDefinition): void {
  toolOverlays[overlay.toolName] = overlay;
}

export function registerSelectionAction(action: SelectionOverlayActionDefinition): void {
  selectionActions[action.id] = action;
}

export function registerDynamicOptionsResolver(
  id: string,
  resolver: OverlayDynamicOptionsResolver,
): void {
  dynamicOptionsResolvers[id] = resolver;
}

export function getItemOverlay(itemOrType: BaseItem | string): ItemOverlayDefinition | undefined {
  const itemType = typeof itemOrType === "string" ? itemOrType : itemOrType.itemType;
  return itemOverlays[itemType];
}

export function getToolOverlay(toolName: string): ToolOverlayDefinition | undefined {
  return toolOverlays[toolName];
}

export function listToolOverlays(): ToolOverlayDefinition[] {
  return Object.values(toolOverlays);
}

export function listSelectionActions(): SelectionOverlayActionDefinition[] {
  return Object.values(selectionActions);
}

export function getSelectionOverlayActions(
  items: readonly BaseItem[],
): SelectionOverlayActionDefinition[] {
  return Object.values(selectionActions).filter(action => action.isAvailable?.(items) ?? true);
}

export function resolveDynamicOptions(
  providerId: string,
  context: OverlayDynamicOptionsContext,
): OverlayOptionDefinition[] {
  return dynamicOptionsResolvers[providerId]?.(context) ?? [];
}

export function intersectOverlayActions(items: readonly BaseItem[]): OverlayActionDefinition[] {
  if (items.length === 0) {
    return [];
  }
  const overlays = items
    .map(item => getItemOverlay(item))
    .filter((overlay): overlay is ItemOverlayDefinition => !!overlay);
  if (overlays.length !== items.length) {
    return [];
  }

  const counts = new Map<string, OverlayActionDefinition>();
  for (const overlay of overlays) {
    for (const action of overlay.actions) {
      if (!counts.has(action.id)) {
        counts.set(action.id, action);
      }
    }
  }

  return [...counts.values()].filter(action =>
    overlays.every(overlay => overlay.actions.some(candidate => candidate.id === action.id))
      && (action.target !== "single" || items.length === 1),
  );
}
