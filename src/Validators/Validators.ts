import { Item } from "Board/Items";
import { FrameData } from "Board/Items";
import { DrawingData } from "Board/Items/Drawing";
import { ImageItemData } from "Board/Items/Image";
import {
	ParagraphNode,
	HeadingNode,
	BlockQuoteNode,
	BulletedListNode,
	NumberedListNode,
	ListItemNode,
	ListItemChild,
} from "Board/Items/RichText/Editor/BlockNode";
import { TextNode } from "Board/Items/RichText/Editor/TextNode";
import { Descendant } from "slate";
import Ajv from "ajv";
import { PlaceholderData } from "Board/Items/Placeholder";
import { GroupData } from "Board/Items/Group";

export const validator = new Ajv();

export type ItemsMap = Record<string, Item>;

type PointData = {
	x: number;
	y: number;
};

export function validateItemsMap(parsedObject: any): parsedObject is ItemsMap {
	// Validate the presence and structure of the serialized ItemsMap object
	if (typeof parsedObject !== "object" || parsedObject === null) {
		return false;
	}

	// Validate each item in the ItemsMap
	for (const key in parsedObject) {
		if (parsedObject.hasOwnProperty(key)) {
			const itemData = parsedObject[key];
			if (!validateItemData(itemData)) {
				return false;
			}
		}
	}

	return true;
}

const itemValidators: Record<string, (data: any) => boolean> = {
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
};

function validateItemData(itemData: any): boolean {
	// Check if the itemData has a valid itemType property
	if (
		!itemData.hasOwnProperty("itemType") ||
		typeof itemData.itemType !== "string"
	) {
		return false;
	}

	const validator = itemValidators[itemData.itemType];
	return validator ? validator(itemData) : false;
}

function validateFrameData(frameData: FrameData): boolean {
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
		frameData.hasOwnProperty("children") &&
		typeof frameData.shapeType === "string" &&
		typeof frameData.backgroundColor === "string" &&
		typeof frameData.backgroundOpacity === "number" &&
		typeof frameData.borderColor === "string" &&
		typeof frameData.borderOpacity === "number" &&
		typeof frameData.borderStyle === "string" &&
		typeof frameData.borderWidth === "number" &&
		Array.isArray(frameData.children) &&
		validateTransformationData(frameData.transformation) &&
		validateRichTextData(frameData.text);
	return isValid;
}

function validateShapeData(shapeData: any): boolean {
	// Validate the presence and types of properties in ShapeData
	const isValid =
		shapeData.hasOwnProperty("shapeType") &&
		shapeData.hasOwnProperty("backgroundColor") &&
		shapeData.hasOwnProperty("backgroundOpacity") &&
		shapeData.hasOwnProperty("borderColor") &&
		shapeData.hasOwnProperty("borderOpacity") &&
		shapeData.hasOwnProperty("borderStyle") &&
		shapeData.hasOwnProperty("borderWidth") &&
		shapeData.hasOwnProperty("transformation") &&
		shapeData.hasOwnProperty("text") &&
		typeof shapeData.shapeType === "string" &&
		typeof shapeData.backgroundColor === "string" &&
		typeof shapeData.backgroundOpacity === "number" &&
		typeof shapeData.borderColor === "string" &&
		typeof shapeData.borderOpacity === "number" &&
		typeof shapeData.borderStyle === "string" &&
		typeof shapeData.borderWidth === "number" &&
		validateTransformationData(shapeData.transformation) &&
		validateRichTextData(shapeData.text);
	return isValid;
}

function validateStickerData(shapeData: any): boolean {
	const isValid =
		shapeData.hasOwnProperty("itemType") &&
		shapeData.hasOwnProperty("backgroundColor") &&
		shapeData.hasOwnProperty("transformation") &&
		shapeData.hasOwnProperty("text") &&
		typeof shapeData.backgroundColor === "string" &&
		validateTransformationData(shapeData.transformation) &&
		validateRichTextData(shapeData.text);
	return isValid;
}

function validateTransformationData(transformationData: any): boolean {
	// Validate the presence and types of properties in TransformationData
	const isValid =
		transformationData.hasOwnProperty("translateX") &&
		transformationData.hasOwnProperty("translateY") &&
		transformationData.hasOwnProperty("scaleX") &&
		transformationData.hasOwnProperty("scaleY") &&
		transformationData.hasOwnProperty("rotate") &&
		typeof transformationData.translateX === "number" &&
		typeof transformationData.translateY === "number" &&
		typeof transformationData.scaleX === "number" &&
		typeof transformationData.scaleY === "number" &&
		typeof transformationData.rotate === "number";
	return isValid;
}

export function validateRichTextData(richTextData: any): boolean {
	// Validate the presence and types of properties in RichTextData
	const isValid =
		richTextData.hasOwnProperty("children") &&
		Array.isArray(richTextData.children) &&
		validateChildren(richTextData.children) &&
		(typeof richTextData.verticalAlignment === "string" ||
			richTextData.verticalAlignment === undefined) &&
		(typeof richTextData.maxWidth === "number" ||
			richTextData.maxWidth === undefined);
	return isValid;
}

function validateConnectorData(connectorData: any): boolean {
	// Validate the presence and types of properties in ConnectorData
	const isValid =
		connectorData.hasOwnProperty("startPoint") &&
		connectorData.hasOwnProperty("endPoint") &&
		connectorData.hasOwnProperty("startPointerStyle") &&
		connectorData.hasOwnProperty("endPointerStyle") &&
		connectorData.hasOwnProperty("lineStyle") &&
		connectorData.hasOwnProperty("lineColor") &&
		connectorData.hasOwnProperty("lineWidth") &&
		connectorData.hasOwnProperty("transformation") &&
		typeof connectorData.startPoint === "object" &&
		typeof connectorData.endPoint === "object" &&
		typeof connectorData.startPointerStyle === "string" &&
		typeof connectorData.endPointerStyle === "string" &&
		typeof connectorData.lineStyle === "string" &&
		typeof connectorData.lineColor === "string" &&
		typeof connectorData.lineWidth === "number" &&
		validateTransformationData(connectorData.transformation);
	return isValid;
}

function validateChildren(children: any): children is Descendant[] {
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

function validateDescendant(descendant: any): descendant is Descendant {
	if (typeof descendant !== "object" || descendant === null) {
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

function validateParagraphNode(node: any): node is ParagraphNode {
	return (
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		Array.isArray(node.children) &&
		node.children.every((child: any) => validateTextNode(child))
	);
}

function validateHeadingNode(node: any): node is HeadingNode {
	return (
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		Array.isArray(node.children) &&
		node.children.every((child: any) => validateTextNode(child))
	);
}

function validateBlockQuoteNode(node: any): node is BlockQuoteNode {
	return (
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		Array.isArray(node.children) &&
		node.children.every((child: any) => validateTextNode(child))
	);
}

function validateBulletedListNode(node: any): node is BulletedListNode {
	return (
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		Array.isArray(node.children) &&
		node.children.every((child: any) => validateListItemChild(child))
	);
}

function validateNumberedListNode(node: any): node is NumberedListNode {
	return (
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		Array.isArray(node.children) &&
		node.children.every((child: any) => validateListItemChild(child))
	);
}

function validateListItemNode(node: any): node is ListItemNode {
	return (
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		Array.isArray(node.children) &&
		node.children.every((child: any) => validateListItemChild(child))
	);
}

function validateListItemChild(child: any): child is ListItemChild {
	return (
		validateTextNode(child) ||
		validateBulletedListNode(child) ||
		validateNumberedListNode(child)
	);
}

function validateTextNode(node: any): node is TextNode {
	return (
		// node.hasOwnProperty("type") &&
		// typeof node.type === "string" &&
		node.hasOwnProperty("text") && typeof node.text === "string"
	);
}

function validateImageItemData(data: any): data is ImageItemData {
	const isValid =
		data.hasOwnProperty("transformation") &&
		data.hasOwnProperty("storageLink") &&
		typeof data.transformation === "object" &&
		typeof data.storageLink === "string" &&
		validateTransformationData(data.transformation);
	return isValid;
}

function validateDrawingData(data: any): data is DrawingData {
	if (
		!(
			data.hasOwnProperty("transformation") &&
			data.hasOwnProperty("points") &&
			typeof data.transformation === "object" &&
			Array.isArray(data.points)
		)
	) {
		return false;
	}

	for (const point of data.points) {
		if (!validatePointData(point)) {
			return false;
		}
	}

	return true;
}

function validatePlaceholderData(data: any): data is PlaceholderData {
	const isValid =
		data.hasOwnProperty("transformation") &&
		data.hasOwnProperty("icon") &&
		data.hasOwnProperty("miroData") &&
		typeof data.transformation === "object" &&
		typeof data.icon === "string" &&
		typeof data.miroData === "object" &&
		validateTransformationData(data.transformation);
	return isValid;
}

function validateAINodeData(data: any): data is PlaceholderData {
	const isValid =
		data.hasOwnProperty("itemType") &&
		data.hasOwnProperty("isUserRequest") &&
		data.hasOwnProperty("transformation") &&
		data.hasOwnProperty("text") &&
		typeof data.isUserRequest === "boolean" &&
		validateTransformationData(data.transformation);
	// validateRichTextData(data.text);
	return isValid;
}

function validatePointData(data: any): data is PointData {
	return (
		data.hasOwnProperty("x") &&
		data.hasOwnProperty("y") &&
		typeof data.x === "number" &&
		typeof data.y === "number"
	);
}

function validateGroupData(groupData: GroupData): boolean {
	const isValid =
		groupData.hasOwnProperty("itemType") &&
		groupData.hasOwnProperty("transformation") &&
		groupData.hasOwnProperty("children") &&
		Array.isArray(groupData.children) &&
		validateTransformationData(groupData.transformation);
	return isValid;
}
