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

// TODO API Switch to Map
function validateItemData(itemData: any): boolean {
	// Check if the itemData has a valid itemType property
	if (
		!itemData.hasOwnProperty("itemType") ||
		typeof itemData.itemType !== "string"
	) {
		return false;
	}

	// Validate based on the itemType
	switch (itemData.itemType) {
		case "Sticker":
			return validateStickerData(itemData);
		case "Shape":
			return validateShapeData(itemData);
		case "RichText":
			return validateRichTextData(itemData);
		case "Connector":
			return validateConnectorData(itemData);
		case "Image":
			return validateImageItemData(itemData);
		case "Drawing":
			return validateDrawingData(itemData);
		case "Frame":
			return validateFrameData(itemData);
		default:
			return false;
	}
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
	// console.log("validateShapeData", shapeData, isValid);
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
	// console.log("validateTransformationData", transformationData, isValid);
	return isValid;
}

export function validateRichTextData(richTextData: any): boolean {
	// Validate the presence and types of properties in RichTextData
	const isValid =
		richTextData.hasOwnProperty("children") &&
		Array.isArray(richTextData.children) &&
		validateChildren(richTextData.children) &&
		richTextData.hasOwnProperty("verticalAlignment") &&
		typeof richTextData.verticalAlignment === "string" &&
		(typeof richTextData.maxWidth === "number" ||
			richTextData.maxWidth === undefined);
	// console.log("validateRichTextData", richTextData, isValid);
	return isValid;
}

function validateConnectorData(connectorData: any): boolean {
	// Validate the presence and types of properties in ConnectorData
	return (
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
		validateTransformationData(connectorData.transformation)
	);
}

function validateChildren(children: any): children is Descendant[] {
	if (!Array.isArray(children)) {
		return false;
	}

	for (const child of children) {
		const isValidDescendant = validateDescendant(child);
		// console.log("validateChildren", child, isValidDescendant);
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
			return validateParagraphNode(descendant);
		case "heading":
			return validateHeadingNode(descendant);
		case "block-quote":
			return validateBlockQuoteNode(descendant);
		case "bulleted-list":
			return validateBulletedListNode(descendant);
		case "numbered-list":
			return validateNumberedListNode(descendant);
		case "list-item":
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
		node.hasOwnProperty("level") &&
		node.hasOwnProperty("children") &&
		typeof node.type === "string" &&
		typeof node.level === "number" &&
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
		node.hasOwnProperty("type") &&
		node.hasOwnProperty("text") &&
		typeof node.type === "string" &&
		typeof node.text === "string"
	);
}

function validateImageItemData(data: any): data is ImageItemData {
	return (
		data.hasOwnProperty("transformation") &&
		data.hasOwnProperty("dataUrl") &&
		typeof data.transformation === "object" &&
		typeof data.dataUrl === "string" &&
		validateTransformationData(data.transformation)
	);
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

function validatePointData(data: any): data is PointData {
	return (
		data.hasOwnProperty("x") &&
		data.hasOwnProperty("y") &&
		typeof data.x === "number" &&
		typeof data.y === "number"
	);
}
