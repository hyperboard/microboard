import type { BaseItem } from "Items/BaseItem/BaseItem";
import type { Tool } from "Tools/Tool";
import type {
  ItemOverlayDefinition,
  OverlayActionDefinition,
  OverlayCondition,
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

export interface OverlayCreateSurfaceGroupEntry {
  kind: "group";
  id: string;
  label: string;
  description?: string;
  icon?: ToolOverlayDefinition["icon"];
  order?: number;
  behavior?: "open-panel" | "activate-last-used";
  tools: ToolOverlayDefinition[];
}

export interface OverlayCreateSurfaceToolEntry {
  kind: "tool";
  tool: ToolOverlayDefinition;
  order?: number;
}

export type OverlayCreateSurfaceEntry =
  | OverlayCreateSurfaceGroupEntry
  | OverlayCreateSurfaceToolEntry;

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

export function listCreateSurfaceEntries(): OverlayCreateSurfaceEntry[] {
  const groupedEntries = new Map<string, OverlayCreateSurfaceGroupEntry>();
  const ungroupedEntries: OverlayCreateSurfaceToolEntry[] = [];

  for (const tool of Object.values(toolOverlays)) {
    const group = tool.surface?.group;
    if (!group) {
      ungroupedEntries.push({
        kind: "tool",
        tool,
        order: tool.surface?.order,
      });
      continue;
    }

    const existing = groupedEntries.get(group.id);
    if (existing) {
      existing.tools.push(tool);
      if (existing.order === undefined && group.order !== undefined) {
        existing.order = group.order;
      }
      continue;
    }

    groupedEntries.set(group.id, {
      kind: "group",
      id: group.id,
      label: group.label,
      description: group.description,
      icon: group.icon,
      order: group.order,
      behavior: group.behavior,
      tools: [tool],
    });
  }

  const sortedGroups = [...groupedEntries.values()]
    .map(group => ({
      ...group,
      tools: [...group.tools].sort(compareToolsBySurfaceOrder),
    }))
    .sort(compareEntriesByOrder);

  const sortedUngroupedEntries = [...ungroupedEntries].sort(compareEntriesByOrder);
  return [...sortedGroups, ...sortedUngroupedEntries];
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

export function matchesOverlayCondition(
  condition: OverlayCondition | undefined,
  context: OverlayDynamicOptionsContext,
): boolean {
  if (!condition) {
    return true;
  }

  switch (condition.kind) {
    case "equals":
      return readOverlayValueSource(context, condition.source) === condition.value;
    case "truthy":
      return !!readOverlayValueSource(context, condition.source);
    case "falsy":
      return !readOverlayValueSource(context, condition.source);
    case "itemTypeIn":
      return context.items?.every(item => condition.itemTypes.includes(item.itemType))
        ?? (context.item ? condition.itemTypes.includes(context.item.itemType) : false);
    case "selectionSize": {
      const size = context.items?.length ?? (context.item ? 1 : 0);
      const meetsMin = condition.min === undefined || size >= condition.min;
      const meetsMax = condition.max === undefined || size <= condition.max;
      return meetsMin && meetsMax;
    }
    case "allOf":
      return condition.conditions.every(child => matchesOverlayCondition(child, context));
    case "anyOf":
      return condition.conditions.some(child => matchesOverlayCondition(child, context));
    case "not":
      return !matchesOverlayCondition(condition.condition, context);
  }
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

function compareToolsBySurfaceOrder(a: ToolOverlayDefinition, b: ToolOverlayDefinition): number {
  const aOrder = a.surface?.order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.surface?.order ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || a.label.localeCompare(b.label);
}

function compareEntriesByOrder(
  a: { order?: number; kind: string; label?: string; tool?: ToolOverlayDefinition },
  b: { order?: number; kind: string; label?: string; tool?: ToolOverlayDefinition },
): number {
  const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
  const aLabel = a.label ?? a.tool?.label ?? "";
  const bLabel = b.label ?? b.tool?.label ?? "";
  return aOrder - bOrder || aLabel.localeCompare(bLabel);
}

function readOverlayValueSource(
  context: OverlayDynamicOptionsContext,
  source: { kind: "itemProperty" | "toolProperty"; property: string },
): unknown {
  if (source.kind === "itemProperty") {
    return context.item ? (context.item as unknown as Record<string, unknown>)[source.property] : undefined;
  }
  return context.tool ? (context.tool as unknown as Record<string, unknown>)[source.property] : undefined;
}
