import { Item, ItemData } from "Items/Item";
import { Board } from "Board";
import { itemFactories } from "itemFactories";
import { BaseCommand, Command } from "Events/Command";
import { itemCommandFactories } from "Events/CreateCommand";
import { CustomTool } from "Tools/CustomTool";
import { registeredTools } from "Tools/Tools";
import { BaseItem, BaseItemData } from "Items/BaseItem/BaseItem";
import { BaseOperation, ItemOperation } from "Events/EventsOperations";
import { itemValidators } from "Validators";

type ItemConstructor = new (board: Board, id: string, defaultData: BaseItemData) => any;

type RegisterItemArgs = {
  item: ItemConstructor;
  defaultData: BaseItemData;
  toolData?: { name: string; tool: typeof CustomTool };
};

export function registerItem({
  item,
  defaultData,
  toolData,
}: RegisterItemArgs): void {
  const { itemType } = defaultData;
  itemFactories[itemType] = createItemFactory(item, defaultData);
  itemValidators[itemType] = createItemValidator(defaultData);
  if (toolData) {
    registeredTools[toolData.name] = toolData.tool;
  }

  itemCommandFactories[itemType] = createItemCommandFactory(itemType);
}

export function registerTool(toolData: { name: string; tool: typeof CustomTool }) {
  registeredTools[toolData.name] = toolData.tool;
}

function createItemFactory(item: ItemConstructor, defaultData: BaseItemData) {
  return function itemFactory(id: string, data: ItemData, board: Board): Item {
    if (data.itemType !== defaultData.itemType) {
      throw new Error(`Invalid data for ${defaultData.itemType}`);
    }
    return (new item(board, id, defaultData) as BaseItem).setId(id).deserialize(data as BaseItemData);
  };
}

function createItemValidator(defaultData: BaseItemData) {
  return function validateItem(itemData: unknown): boolean {
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
      operation as BaseOperation
    );
  };
}
