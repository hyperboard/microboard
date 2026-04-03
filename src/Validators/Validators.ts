import { ItemData } from "Items";
import { RichTextDataSchema } from "Items/RichText/RichText.schema";
import { TransformationDataSchema } from "Geometry/Transformation/Transformation.schema";
import { PointSchema } from "Geometry/Point/Point.schema";
import { itemValidators } from "../RegistryMaps";

export type ItemsMap = Record<string, ItemData>;

export function validateItemsMap(parsedObject: unknown): parsedObject is ItemsMap {
  if (typeof parsedObject !== "object" || parsedObject === null) {
    return false;
  }

  const data = parsedObject as Record<string, unknown>;
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      if (!validateItemData(data[key])) {
        return false;
      }
    }
  }

  return true;
}

export type ItemValidator = (data: unknown) => boolean;

export function validateItemData(itemData: unknown): boolean {
  if (
    typeof itemData !== "object" ||
    itemData === null ||
    !("itemType" in itemData) ||
    typeof itemData.itemType !== "string"
  ) {
    return false;
  }

  const validator = itemValidators[itemData.itemType];
  return validator ? validator(itemData) : false;
}

export function validateRichTextData(richTextData: unknown): boolean {
  return RichTextDataSchema.safeParse(richTextData).success;
}

export function validateTransformationData(transformationData: unknown): boolean {
  return TransformationDataSchema.safeParse(transformationData).success;
}

export function validatePointData(pointData: unknown): boolean {
  return PointSchema.safeParse(pointData).success;
}
