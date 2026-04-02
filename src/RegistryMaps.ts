import type { ItemData, Item } from "Items/Item";
import type { Board } from "Board";
import type { ItemValidator } from "Validators";
import type { ItemCommandFactory } from "Events/Command";
import type { CustomTool } from "Tools/CustomTool";
import type { z } from "zod";

export interface ItemFactory {
  (id: string, data: ItemData, board: Board): Item;
}

export type CustomToolConstructor = new (board: Board, name: string, ...args: any[]) => CustomTool;

export const itemFactories: Record<string, ItemFactory> = {};
export type ItemFactories = typeof itemFactories;
export const itemValidators: Record<string, ItemValidator> = {};
export const itemCommandFactories: Record<string, ItemCommandFactory> = {};
export const registeredTools: Record<string, CustomToolConstructor> = {};
export const itemSchemas: Record<string, z.ZodObject<any>> = {};
