// TODO use zod
import { ItemData, FrameData } from "Items";
import { AudioItemData } from "Items/Audio";
import { DrawingData } from "Items/Drawing";
import { GroupData } from "Items/Group";
import { ImageItemData } from "Items/Image";
import { PlaceholderData } from "Items/Placeholder";
import {
  ParagraphNode,
  BlockQuoteNode,
  BulletedListNode,
  NumberedListNode,
  ListItemNode,
  ListItemChild,
  HeadingNode,
} from "Items/RichText/Editor/BlockNode";
import { TextNode } from "Items/RichText/Editor/TextNode";
import { VideoItemData } from "Items/Video";
import { Descendant } from "slate";

export type ItemsMap = Record<string, ItemData>;

type PointData = {
  x: number;
  y: number;
};

export function validateItemsMap(parsedObject: unknown): parsedObject is ItemsMap {
  // Validate the presence and structure of the serialized ItemsMap object
  if (typeof parsedObject !== "object" || parsedObject === null) {
    return false;
  }

  const data = parsedObject as Record<string, unknown>;
  // Validate each item in the ItemsMap
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const itemData = data[key];
      if (!validateItemData(itemData)) {
        return false;
      }
    }
  }

  return true;
}

export type ItemValidator = (data: unknown) => boolean;

// Accepts both legacy string colors and new ColorValue objects { type, value }
function isColorValue(v: unknown): boolean {
  return typeof v === "string" || (typeof v === "object" && v !== null);
}

export const itemValidators: Record<string, ItemValidator> = {
  Sticker: validateStickerData,
  Shape: validateShapeData,
  RichText: validateRichTextData,
  Connector: validateConnectorData,
  Image: validateImageItemData,
  Drawing: validateDrawingData,
  Frame: validateFrameData,
  Placeholder: validatePlaceholderData,
  AINode: validateAINodeData,
  Group: validateGroupData,
  Video: validateVideoItemData,
  Audio: validateAudioItemData,
};

function validateItemData(itemData: unknown): boolean {
  // Check if the itemData has a valid itemType property
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

function validateFrameData(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const frameData = data as Record<string, unknown>;
  // Validate the presence and types of properties in FrameData
  const isValid =
    frameData.hasOwnProperty("shapeType") &&
    frameData.hasOwnProperty("backgroundColor") &&
    frameData.hasOwnProperty("backgroundOpacity") &&
    frameData.hasOwnProperty("borderColor") &&
    frameData.hasOwnProperty("borderOpacity") &&
    frameData.hasOwnProperty("borderStyle") &&
    frameData.hasOwnProperty("borderWidth") &&
    frameData.hasOwnProperty("transformation") &&
    frameData.hasOwnProperty("text") &&
    (frameData.hasOwnProperty("childIds") || frameData.hasOwnProperty("children")) &&
    typeof frameData.shapeType === "string" &&
    isColorValue(frameData.backgroundColor) &&
    typeof frameData.backgroundOpacity === "number" &&
    isColorValue(frameData.borderColor) &&
    typeof frameData.borderOpacity === "number" &&
    typeof frameData.borderStyle === "string" &&
    typeof frameData.borderWidth === "number" &&
    (Array.isArray(frameData.childIds) || Array.isArray(frameData.children)) &&
    validateTransformationData(frameData.transformation) &&
    validateRichTextData(frameData.text);
  return isValid;
}

function validateShapeData(shapeData: unknown): boolean {
  if (typeof shapeData !== "object" || shapeData === null) {
    return false;
  }
  const data = shapeData as Record<string, unknown>;

  // Validate the presence and types of properties in ShapeData
  const isValid =
    data.hasOwnProperty("shapeType") &&
    data.hasOwnProperty("backgroundColor") &&
    data.hasOwnProperty("backgroundOpacity") &&
    data.hasOwnProperty("borderColor") &&
    data.hasOwnProperty("borderOpacity") &&
    data.hasOwnProperty("borderStyle") &&
    data.hasOwnProperty("borderWidth") &&
    data.hasOwnProperty("transformation") &&
    data.hasOwnProperty("text") &&
    typeof data.shapeType === "string" &&
    isColorValue(data.backgroundColor) &&
    typeof data.backgroundOpacity === "number" &&
    isColorValue(data.borderColor) &&
    typeof data.borderOpacity === "number" &&
    typeof data.borderStyle === "string" &&
    typeof data.borderWidth === "number" &&
    validateTransformationData(data.transformation) &&
    validateRichTextData(data.text);
  return isValid;
}

function validateStickerData(shapeData: unknown): boolean {
  if (typeof shapeData !== "object" || shapeData === null) {
    return false;
  }
  const data = shapeData as Record<string, unknown>;
  const isValid =
    data.hasOwnProperty("itemType") &&
    data.hasOwnProperty("backgroundColor") &&
    data.hasOwnProperty("transformation") &&
    data.hasOwnProperty("text") &&
    isColorValue(data.backgroundColor) &&
    validateTransformationData(data.transformation) &&
    validateRichTextData(data.text);
  return isValid;
}

function validateTransformationData(transformationData: unknown): boolean {
  if (typeof transformationData !== "object" || transformationData === null) {
    return false;
  }
  const data = transformationData as Record<string, unknown>;
  // Validate the presence and types of properties in TransformationData
  const isValid =
    data.hasOwnProperty("translateX") &&
    data.hasOwnProperty("translateY") &&
    data.hasOwnProperty("scaleX") &&
    data.hasOwnProperty("scaleY") &&
    data.hasOwnProperty("rotate") &&
    typeof data.translateX === "number" &&
    typeof data.translateY === "number" &&
    typeof data.scaleX === "number" &&
    typeof data.scaleY === "number" &&
    typeof data.rotate === "number";
  return isValid;
}

export function validateRichTextData(richTextData: unknown): boolean {
  if (typeof richTextData !== "object" || richTextData === null) {
    return false;
  }
  const data = richTextData as Record<string, unknown>;
  // Validate the presence and types of properties in RichTextData
  const isValid =
    data.hasOwnProperty("children") &&
    Array.isArray(data.children) &&
    validateChildren(data.children) &&
    (typeof data.verticalAlignment === "string" ||
      data.verticalAlignment === undefined) &&
    (typeof data.maxWidth === "number" ||
      data.maxWidth === undefined);
  return isValid;
}

function validateConnectorData(connectorData: unknown): boolean {
  if (typeof connectorData !== "object" || connectorData === null) {
    return false;
  }
  const data = connectorData as Record<string, unknown>;
  // Validate the presence and types of properties in ConnectorData
  const isValid =
    data.hasOwnProperty("startPoint") &&
    data.hasOwnProperty("endPoint") &&
    data.hasOwnProperty("startPointerStyle") &&
    data.hasOwnProperty("endPointerStyle") &&
    data.hasOwnProperty("lineStyle") &&
    data.hasOwnProperty("lineColor") &&
    data.hasOwnProperty("lineWidth") &&
    data.hasOwnProperty("transformation") &&
    typeof data.startPoint === "object" &&
    typeof data.endPoint === "object" &&
    typeof data.startPointerStyle === "string" &&
    typeof data.endPointerStyle === "string" &&
    typeof data.lineStyle === "string" &&
    isColorValue(data.lineColor) &&
    typeof data.lineWidth === "number" &&
    validateTransformationData(data.transformation);
  return isValid;
}

function validateChildren(children: unknown): children is Descendant[] {
  if (!Array.isArray(children)) {
    return false;
  }

  for (const child of children) {
    const isValidDescendant = validateDescendant(child);
    if (!isValidDescendant) {
      return false;
    }
  }

  return true;
}

function validateDescendant(descendant: unknown): descendant is Descendant {
  if (typeof descendant !== "object" || descendant === null || !("type" in descendant)) {
    return false;
  }

  switch (descendant.type) {
    case "paragraph":
    case "code_block":
      return validateParagraphNode(descendant);
    case "heading_one":
    case "heading_two":
    case "heading_three":
    case "heading_four":
    case "heading_five":
      return validateHeadingNode(descendant);
    case "block-quote":
      return validateBlockQuoteNode(descendant);
    case "ul_list":
      return validateBulletedListNode(descendant);
    case "ol_list":
      return validateNumberedListNode(descendant);
    case "list_item":
      return validateListItemNode(descendant);
    default:
      return false;
  }
}

function validateParagraphNode(node: unknown): node is ParagraphNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    n.hasOwnProperty("type") &&
    n.hasOwnProperty("children") &&
    typeof n.type === "string" &&
    Array.isArray(n.children) &&
    n.children.every((child: unknown) => validateTextNode(child))
  );
}

function validateHeadingNode(node: unknown): node is HeadingNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    n.hasOwnProperty("type") &&
    n.hasOwnProperty("children") &&
    typeof n.type === "string" &&
    Array.isArray(n.children) &&
    n.children.every((child: unknown) => validateTextNode(child))
  );
}

function validateBlockQuoteNode(node: unknown): node is BlockQuoteNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    n.hasOwnProperty("type") &&
    n.hasOwnProperty("children") &&
    typeof n.type === "string" &&
    Array.isArray(n.children) &&
    n.children.every((child: unknown) => validateTextNode(child))
  );
}

function validateBulletedListNode(node: unknown): node is BulletedListNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    n.hasOwnProperty("type") &&
    n.hasOwnProperty("children") &&
    typeof n.type === "string" &&
    Array.isArray(n.children) &&
    n.children.every((child: unknown) => validateListItemChild(child))
  );
}

function validateNumberedListNode(node: unknown): node is NumberedListNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    n.hasOwnProperty("type") &&
    n.hasOwnProperty("children") &&
    typeof n.type === "string" &&
    Array.isArray(n.children) &&
    n.children.every((child: unknown) => validateListItemChild(child))
  );
}

function validateListItemNode(node: unknown): node is ListItemNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    n.hasOwnProperty("type") &&
    n.hasOwnProperty("children") &&
    typeof n.type === "string" &&
    Array.isArray(n.children) &&
    n.children.every((child: unknown) => validateListItemChild(child))
  );
}

function validateListItemChild(child: unknown): child is ListItemChild {
  return (
    validateTextNode(child) ||
    validateBulletedListNode(child) ||
    validateNumberedListNode(child)
  );
}

function validateTextNode(node: unknown): node is TextNode {
  if (typeof node !== "object" || node === null) {
    return false;
  }
  const n = node as Record<string, unknown>;
  return (
    // n.hasOwnProperty("type") &&
    // typeof n.type === "string" &&
    n.hasOwnProperty("text") && typeof n.text === "string"
  );
}

function validateImageItemData(data: unknown): data is ImageItemData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  const isValid =
    d.hasOwnProperty("transformation") &&
    d.hasOwnProperty("storageLink") &&
    typeof d.transformation === "object" &&
    typeof d.storageLink === "string" &&
    validateTransformationData(d.transformation);
  return isValid;
}

function validateVideoItemData(data: unknown): data is VideoItemData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  const isValid =
    d.hasOwnProperty("transformation") &&
    d.hasOwnProperty("url") &&
    d.hasOwnProperty("isStorageUrl") &&
    d.hasOwnProperty("previewUrl") &&
    typeof d.transformation === "object" &&
    typeof d.url === "string" &&
    typeof d.previewUrl === "string" &&
    typeof d.isStorageUrl === "boolean" &&
    validateTransformationData(d.transformation);
  return isValid;
}

function validateAudioItemData(data: unknown): data is AudioItemData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  const isValid =
    d.hasOwnProperty("transformation") &&
    d.hasOwnProperty("url") &&
    d.hasOwnProperty("extension") &&
    typeof d.transformation === "object" &&
    typeof d.url === "string" &&
    typeof d.extension === "string" &&
    validateTransformationData(d.transformation);
  return isValid;
}

function validateDrawingData(data: unknown): data is DrawingData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  if (
    !(
      d.hasOwnProperty("transformation") &&
      d.hasOwnProperty("points") &&
      typeof d.transformation === "object" &&
      Array.isArray(d.points)
    )
  ) {
    return false;
  }

  for (const point of d.points) {
    if (!validatePointData(point)) {
      return false;
    }
  }

  return true;
}

function validatePlaceholderData(data: unknown): data is PlaceholderData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  const isValid =
    d.hasOwnProperty("transformation") &&
    d.hasOwnProperty("icon") &&
    d.hasOwnProperty("miroData") &&
    typeof d.transformation === "object" &&
    typeof d.icon === "string" &&
    typeof d.miroData === "object" &&
    validateTransformationData(d.transformation);
  return isValid;
}

function validateAINodeData(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  const isValid =
    d.hasOwnProperty("itemType") &&
    d.hasOwnProperty("isUserRequest") &&
    d.hasOwnProperty("transformation") &&
    d.hasOwnProperty("text") &&
    typeof d.isUserRequest === "boolean" &&
    validateTransformationData(d.transformation);
  // validateRichTextData(data.text);
  return isValid;
}

function validatePointData(data: unknown): data is PointData {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const d = data as Record<string, unknown>;
  return (
    d.hasOwnProperty("x") &&
    d.hasOwnProperty("y") &&
    typeof d.x === "number" &&
    typeof d.y === "number"
  );
}

function validateGroupData(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const groupData = data as Record<string, unknown>;
  const isValid =
    groupData.hasOwnProperty("itemType") &&
    groupData.hasOwnProperty("transformation") &&
    groupData.hasOwnProperty("children") &&
    Array.isArray(groupData.children) &&
    validateTransformationData(groupData.transformation);
  return isValid;
}
