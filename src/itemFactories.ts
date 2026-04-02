import type { Board } from "Board";
import type { ItemData, Item } from "Items/Item";

import {
  itemFactories as registryItemFactories,
} from "./RegistryMaps";
export type { ItemFactories } from "./RegistryMaps";
export const itemFactories = registryItemFactories;

// Trigger self-registration of core items
import "Items/Shape/Shape";
import "Items/Sticker/Sticker";
import "Items/RichText/RichText";
import "Items/Connector/Connector";
import "Items/Image/Image";
import "Items/Drawing/Drawing";
import "Items/Frame/Frame";
import "Items/Placeholder/Placeholder";
import "Items/Comment/Comment";
import "Items/Group/Group";
import "Items/AINode/AINode";
import "Items/Video/Video";
import "Items/Audio/Audio";

// Trigger self-registration of example items
import "Items/Examples/Star/Star";
import "Items/Examples/Counter/Counter";
import "Items/Examples/CardGame/Card/Card";
import "Items/Examples/CardGame/Deck/Deck";
import "Items/Examples/CardGame/Dice/Dice";
import "Items/Examples/CardGame/Screen/Screen";

