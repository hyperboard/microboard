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

import type { StickerData } from "Items/Sticker/StickerOperation";
import type { CommentData } from "Items/Comment";
import type { AINodeData } from "Items/AINode";
import type { ShapeData } from "Items/Shape/ShapeData";
import type { RichTextData } from "Items/RichText/RichTextData";
import type { ConnectorData } from "Items/Connector/ConnectorOperations";
import type { ImageItemData } from "Items/Image";
import type { VideoItemData } from "Items/Video";
import type { AudioItemData } from "Items/Audio";
import type { DrawingData } from "Items/Drawing";
import type { FrameData } from "Items/Frame/FrameData";
import type { PlaceholderData } from "Items/Placeholder";
import type { GroupData } from "Items/Group";

export function isStickerData(data: ItemData): data is StickerData { return data.itemType === "Sticker"; }
export function isAINodeData(data: ItemData): data is AINodeData { return data.itemType === "AINode"; }
export function isConnectorData(data: ItemData): data is ConnectorData { return data.itemType === "Connector"; }
export function isImageItemData(data: ItemData): data is ImageItemData { return data.itemType === "Image"; }
export function isVideoItemData(data: ItemData): data is VideoItemData { return data.itemType === "Video"; }
export function isAudioItemData(data: ItemData): data is AudioItemData { return data.itemType === "Audio"; }
export function isFrameData(data: ItemData): data is FrameData { return data.itemType === "Frame"; }
export function isGroupData(data: ItemData): data is GroupData { return data.itemType === "Group"; }
