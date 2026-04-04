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

// Trigger self-registration of game/card items
import "Items/Card/Card";
import "Items/Deck/Deck";
import "Items/Dice/Dice";
import "Items/Screen/Screen";

