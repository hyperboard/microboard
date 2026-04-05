import { Item, ItemData } from "Items/Item";
import { z } from "zod";
import { Board } from "Board";
import {
  BoardToolConstructor,
  itemFactories,
  itemCommandFactories,
  itemValidators,
  itemSchemas,
  registeredTools,
} from "../RegistryMaps";
import { BaseCommand, Command } from "Events/Command";
import { CustomTool } from "Tools/CustomTool";
import { BoardTool } from "Tools/BoardTool";
import { BaseItem, BaseItemData } from "Items/BaseItem/BaseItem";
import { BaseOperation, ItemOperation, Operation } from "Events/EventsOperations";
import type { ItemOverlayDefinition, ToolOverlayDefinition } from "Overlay";
import { registerItemOverlay, registerToolOverlay } from "Overlay";

type ItemConstructor = new (board: Board, id: string) => BaseItem;

type RegisterItemArgs = {
  item: ItemConstructor;
  defaultData: BaseItemData;
  toolData?: { name: string; tool: BoardToolConstructor; overlay?: ToolOverlayDefinition };
  schema?: z.ZodType<any>;
  overlay?: ItemOverlayDefinition;
};

export function registerItem({
  item,
  defaultData,
  toolData,
  schema,
  overlay,
}: RegisterItemArgs): void {
  const { itemType } = defaultData;
  itemFactories[itemType] = createItemFactory(item, defaultData);
  itemValidators[itemType] = createItemValidator(defaultData, schema);
  (item as any).overlay = overlay;
  if (schema) {
    itemSchemas[itemType] = schema as any;
  }
  if (toolData) {
    registeredTools[toolData.name] = toolData.tool;
    (toolData.tool as any).overlay = toolData.overlay;
    if (toolData.overlay) {
      registerToolOverlay(toolData.overlay);
    }
  }
  if (overlay) {
    registerItemOverlay(overlay);
  }

  if (!itemCommandFactories[itemType]) {
    itemCommandFactories[itemType] = createItemCommandFactory(itemType);
  }
}

export function registerTool(toolData: {
  name: string;
  tool: BoardToolConstructor;
  overlay?: ToolOverlayDefinition;
}) {
  registeredTools[toolData.name] = toolData.tool;
  (toolData.tool as any).overlay = toolData.overlay;
  if (toolData.overlay) {
    registerToolOverlay(toolData.overlay);
  }
}

function createItemFactory(item: ItemConstructor, defaultData: BaseItemData) {
  return function itemFactory(id: string, data: ItemData, board: Board): Item {
    if (data.itemType !== defaultData.itemType) {
      throw new Error(`Invalid data for ${defaultData.itemType}`);
    }
    if (!item) {
      throw new Error(`itemFactory: item is undefined for ${defaultData.itemType}`);
    }
    return new item(board, id).setId(id).deserialize(data as BaseItemData);
  };
}

function createItemValidator(defaultData: BaseItemData, schema?: z.ZodType<any>) {
  return function validateItem(itemData: unknown): boolean {
    if (schema) {
      const result = schema.safeParse(itemData);
      return result.success;
    }
    if (typeof itemData !== "object" || itemData === null) {
      return false;
    }
    const data = itemData as Record<string, unknown>;
    for (const [key, value] of Object.entries(defaultData)) {
      if (
        !data.hasOwnProperty(key) ||
        typeof data[key] !== typeof value
      ) {
        return false;
      }
    }
    return true;
  };
}

function createItemCommandFactory(itemType: string) {
  return function itemCommandFactory(
    items: Item[],
    operation: ItemOperation,
    board?: Board,
  ): Command {
    if (!board) {
      throw new Error("Board is required for BaseCommand");
    }
    return new BaseCommand(
      board,
      items.filter((item): boolean => item.itemType === itemType).map(item => item.getId()),
      operation as Operation
    );
  };
}
