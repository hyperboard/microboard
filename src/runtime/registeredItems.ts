import { itemFactories } from "../itemFactories";
import { itemSchemas } from "../Items/itemSchemas";
import { getItemOverlay, listToolOverlays } from "../Overlay";

export interface RegisteredCreateToolDescriptor {
  toolName: string;
  label: string;
  description?: string;
  launchKind?: "activate-tool" | "workflow";
  surfaceGroupId?: string;
  surfaceGroupLabel?: string;
}

export interface RegisteredItemDescriptor {
  itemType: string;
  hasFactory: boolean;
  schemaPropertyKeys: string[];
  hasOverlay: boolean;
  overlayActionIds: string[];
  createTools: RegisteredCreateToolDescriptor[];
}

function getSchemaPropertyKeys(itemType: string): string[] {
  const schema = itemSchemas[itemType] as { shape?: Record<string, unknown> } | undefined;
  return schema?.shape ? Object.keys(schema.shape).sort() : [];
}

export function listRegisteredItemTypes(): string[] {
  return Object.keys(itemFactories).sort();
}

export function describeRegisteredItems(): RegisteredItemDescriptor[] {
  const createToolsByItemType = new Map<string, RegisteredCreateToolDescriptor[]>();

  for (const tool of listToolOverlays()) {
    if (!tool.createsItemType) {
      continue;
    }

    const current = createToolsByItemType.get(tool.createsItemType) || [];
    current.push({
      toolName: tool.toolName,
      label: tool.label,
      description: tool.description,
      launchKind: tool.launch?.kind,
      surfaceGroupId: tool.surface?.group?.id,
      surfaceGroupLabel: tool.surface?.group?.label,
    });
    createToolsByItemType.set(tool.createsItemType, current);
  }

  return listRegisteredItemTypes().map((itemType) => {
    const overlay = getItemOverlay(itemType);
    return {
      itemType,
      hasFactory: typeof itemFactories[itemType] === "function",
      schemaPropertyKeys: getSchemaPropertyKeys(itemType),
      hasOverlay: Boolean(overlay),
      overlayActionIds: overlay?.actions.map((action) => action.id).sort() || [],
      createTools:
        createToolsByItemType
          .get(itemType)
          ?.sort((a, b) => a.label.localeCompare(b.label)) || [],
    };
  });
}
