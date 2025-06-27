import { Item, ItemData } from "Items/Item";
import { Board } from "Board";
import { itemFactories } from "itemFactories";
import { BaseCommand, Command, itemCommandFactories } from "Events/Command";
import { CustomTool } from "Tools/CustomTool";
import { registeredTools } from "Tools/Tools";
import { BaseItem, BaseItemData } from "Items/BaseItem/BaseItem";
import { BaseOperation, ItemOperation } from "Events/EventsOperations";
import { itemValidators } from "Validators";

type RegisterItemArgs = {
  item: any;
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

function createItemFactory(item: any, defaultData: BaseItemData) {
  return function itemFactory(id: string, data: ItemData, board: Board): Item {
    if (data.itemType !== defaultData.itemType) {
      throw new Error(`Invalid data for ${defaultData.itemType}`);
    }
    return new item(board, id, defaultData).setId(id).deserialize(data);
  };
}

function createItemValidator(defaultData: BaseItemData) {
  return function validateItem(itemData: any): boolean {
    for (const [key, value] of Object.entries(defaultData)) {
      if (
        !itemData.hasOwnProperty(key) ||
        typeof itemData[key] !== typeof value
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
    operation: ItemOperation
  ): Command {
    return new BaseCommand(
      items.filter((item): boolean => item.itemType === itemType) as BaseItem[],
      operation as BaseOperation
    );
  };
}
