import { Descendant, Text } from "slate";
import { DEFAULT_TEXT_STYLES } from "View/Items/RichText";
import {
	ItemType,
	RichTextData,
	Matrix,
	ItemData,
	FrameData,
	ShapeData,
	ConnectorData,
} from "./Items";
import { HorisontalAlignment, VerticalAlignment } from "./Items/Alignment";
import { TransformationData } from "./Items/Transformation";
import { Frames, FrameType } from "./Items/Frame/Basic";
import { BorderStyle } from "./Items/Path";
import { positionAbsolutely, positionRelatively } from "./HTMLRender";
import { ShapeType } from "./Items/Shape";
import { DefaultRichTextData } from "./Items/RichText/RichTextData";
import { TextNode } from "./Items/RichText/Editor/TextNode";
import { StickerData } from "./Items/Sticker/StickerOperation";
import { LinkTo } from "./Items/LinkTo/LinkTo";
import { ImageItemData } from "./Items/Image";
import { ConnectorPointerStyle } from "./Items/Connector/Pointers/Pointers";
import { ControlPointData } from "./Items/Connector/ControlPoint";
import { ConnectorLineStyle } from "./Items/Connector";
import { ConnectionLineWidth } from "./Items/Connector/Connector";

type MapTagByType = Record<ItemType, string>;
export const tagByType: MapTagByType = {
	Sticker: "sticker",
	Shape: "shape",
	RichText: "rich-text",
	Connector: "connector",
	Image: "image-item",
	Drawing: "drawing",
	Frame: "frame-item",
	Placeholder: "",
	Comment: "",
	Group: "",
};

type TagFactories = {
	[K in keyof MapTagByType as MapTagByType[K]]: (el: HTMLElement) => ItemData;
};
export const parsersHTML: TagFactories = {
	sticker: parseHTMLSticker,
	shape: parseHTMLShape,
	"rich-text": parseHTMLRichText,
	connector: parseHTMLConnector,
	"image-item": parseHTMLImage,
	// "drawing": createDrawing,
	"frame-item": parseHTMLFrame,
};

function getTransformationData(el: HTMLElement): TransformationData {
	const transformStyle = el.style.transform;
	const transformMatch = transformStyle.match(
		/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^,]+),\s*([^)]+)\)/,
	);
	if (transformMatch) {
		const [, translateX, translateY, scaleX, scaleY] =
			transformMatch.map(Number);
		const matrix = new Matrix(translateX, translateY, scaleX, scaleY);
		return { ...matrix, rotate: 0 };
	}

	return { ...new Matrix(), rotate: 0 };
}

function parseHTMLRichText(
	el: HTMLElement,
	options?: {
		insideOf: ItemType;
		realTransformation: TransformationData;
	},
): RichTextData & { id: string } {
	const parseNode = (node: HTMLElement): Descendant => {
		if (
			node.tagName.toLowerCase() === "span" &&
			node.children.length === 0
		) {
			return {
				type: "text",
				text: node.textContent || "",
				bold: node.style.fontWeight === "700",
				italic: node.style.fontStyle === "italic",
				underline: node.style.textDecoration.includes("underline"),
				lineThrough: node.style.textDecoration.includes("line-through"),
				fontColor: node.style.color || DEFAULT_TEXT_STYLES.fontColor,
				fontHighlight:
					node.style.backgroundColor ||
					DEFAULT_TEXT_STYLES.fontHighlight,
				fontSize:
					parseFloat(node.style.fontSize) ||
					DEFAULT_TEXT_STYLES.fontSize,
				fontFamily:
					node.style.fontFamily || DEFAULT_TEXT_STYLES.fontFamily,
				overline: false,
				subscript: false,
				superscript: false,
			};
		}

		const children = Array.from(node.children).map(child =>
			parseNode(child as HTMLElement),
		);

		switch (node.tagName.toLowerCase()) {
			case "blockquote":
				return {
					type: "block-quote",
					horisontalAlignment: (node.style.textAlign ||
						"left") as HorisontalAlignment,
					children,
				};
			case "p":
			default:
				if (
					["h1", "h2", "h3", "h4", "h5", "h6"].includes(
						node.tagName.toLowerCase(),
					)
				) {
					return {
						type: "heading",
						level: parseInt(node.tagName[1]),
						horisontalAlignment: (node.style.textAlign ||
							"left") as HorisontalAlignment,
						children,
					};
				}
				return {
					type: "paragraph",
					horisontalAlignment: (node.style.textAlign ||
						"left") as HorisontalAlignment,
					children,
				};
		}
	};

	const data: RichTextData & { id: string } = {
		id: el.id,
		itemType: "RichText",
		placeholderText: el.getAttribute("data-placeholder-text") || "",
		realSize: (el.getAttribute("data-real-size") === "auto" && "auto") || 0,
		linkTo: el.getAttribute("data-link-to") || "",
		maxWidth: parseInt(el.style.maxWidth),
		verticalAlignment:
			(el.getAttribute("data-vertical-alignment") as VerticalAlignment) ||
			"top",
		children: Array.from(el.children).map(child =>
			parseNode(child as HTMLElement),
		),
	};

	if (options) {
		data.transformation = options.realTransformation;
		data.insideOf = options.insideOf;
	} else {
		data.insideOf = "RichText";
		data.transformation = getTransformationData(el);
	}

	return data;
}

function parseHTMLFrame(el: HTMLElement): {
	data: FrameData & { id: string };
	childrenMap: { [id: string]: ItemData & { id: string } };
} {
	const data: FrameData & { id: string } = {
		id: el.id,
		itemType: "Frame",
		shapeType: "Custom",
		// (el.getAttribute("data-shape-type") as FrameType) || "Custom",
		backgroundColor: el.style.backgroundColor || "",
		backgroundOpacity: parseFloat(el.style.opacity) || 1,
		borderColor: el.style.borderColor || "",
		borderWidth: parseInt(el.style.borderWidth) || 0,
		children: [],
		borderOpacity: 1,
		borderStyle: (el.style.borderStyle as BorderStyle) || "",
	};

	const defaultPath = Frames["Custom"].path.copy();
	const defaultMbr = defaultPath.getMbr();
	const scaleX = parseInt(el.style.width) / defaultMbr.getWidth();
	const scaleY = parseInt(el.style.height) / defaultMbr.getHeight();

	const transformation = getTransformationData(el);
	transformation.scaleX = scaleX;
	transformation.scaleY = scaleY;
	data.transformation = transformation;
	const text = el.querySelector(`#${CSS.escape(el.id)}_text`);
	if (text) {
		data.text = parseHTMLRichText(text as HTMLElement, {
			insideOf: "Frame",
			realTransformation: transformation,
		});
	}

	const childrenMap = Array.from(el.children)
		.filter(child => child.id !== `${el.id}_text`)
		.map(child => positionAbsolutely(child as HTMLElement, el))
		.reduce((acc: { [id: string]: ItemData }, child) => {
			acc[child.id] = parsersHTML[child.tagName.toLowerCase()](
				child as HTMLElement,
			);
			return acc;
		}, {});

	return { data, childrenMap };
}

function parseHTMLShape(el: HTMLElement): ShapeData & { id: string } {
	const shapeData: ShapeData & { id: string } = {
		id: el.id,
		itemType: "Shape",
		shapeType:
			(el.getAttribute("data-shape-type") as ShapeType) || "Rectangle",
		backgroundOpacity: parseFloat(el.style.opacity) || 1,
		borderOpacity: 1,
		backgroundColor: el.getAttribute("fill") || "",
		borderColor: el.getAttribute("stroke") || "",
		borderWidth: parseInt(el.getAttribute("stroke-width") || "0"),
		borderStyle:
			(el.getAttribute("data-border-style") as BorderStyle) || "",
		transformation: getTransformationData(el),
		text: new DefaultRichTextData(),
	};

	const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
	if (textElement) {
		shapeData.text = parseHTMLRichText(textElement as HTMLElement, {
			insideOf: "Shape",
			realTransformation: shapeData.transformation,
		});
	}

	return shapeData;
}

function parseHTMLSticker(el: HTMLElement): StickerData & { id: string } {
	const transformation = getTransformationData(el);

	const stickerData: StickerData & { id: string } = {
		id: el.id,
		itemType: "Sticker",
		backgroundColor: el.style.backgroundColor || "",
		transformation,
		text: new DefaultRichTextData(),
		linkTo: new LinkTo(),
	};

	const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
	if (textElement) {
		stickerData.text = parseHTMLRichText(textElement as HTMLElement, {
			insideOf: "Sticker",
			realTransformation: transformation,
		});
	}

	return stickerData;
}

function parseHTMLImage(el: HTMLElement): ImageItemData & { id: string } {
	const transformation = getTransformationData(el);

	const imageItemData: ImageItemData & { id: string } = {
		id: el.id,
		itemType: "Image",
		transformation,
		imageDimension: {
			width: parseInt(el.style.width),
			height: parseInt(el.style.height),
		},
		storageLink: el.style.backgroundImage.slice(5, -2), // Remove 'url("")'
		linkTo: "",
	};

	return imageItemData;
}

function parseHTMLConnector(el: HTMLElement): ConnectorData & { id: string } {
	const transformation = getTransformationData(el);

	const startItem = el.getAttribute("data-start-point-item");
	const startRelativeX = parseFloat(
		el.getAttribute("data-start-point-relative-x") || "",
	);
	const startRelativeY = parseFloat(
		el.getAttribute("data-start-point-relative-y") || "",
	);
	const startPoint: ControlPointData = {
		pointType: el.getAttribute(
			"data-start-point-type",
		) as ControlPointData["pointType"],
		x: parseFloat(el.getAttribute("data-start-point-x") || "0"),
		y: parseFloat(el.getAttribute("data-start-point-y") || "0"),
		...(startRelativeX ? { relativeX: startRelativeX } : {}),
		...(startRelativeY ? { relativeY: startRelativeY } : {}),
		...(startItem ? { itemId: startItem } : {}),
	};

	const endItem = el.getAttribute("data-end-point-item");
	const endRelativeX = parseFloat(
		el.getAttribute("data-end-point-relative-x") || "",
	);
	const endRelativeY = parseFloat(
		el.getAttribute("data-end-point-relative-y") || "",
	);
	const endPoint: ControlPointData = {
		pointType: el.getAttribute(
			"data-end-point-type",
		) as ControlPointData["pointType"],
		x: parseFloat(el.getAttribute("data-end-point-x") || "0"),
		y: parseFloat(el.getAttribute("data-end-point-y") || "0"),
		...(endItem ? { itemId: endItem } : {}),
		...(endRelativeX ? { relativeX: endRelativeX } : {}),
		...(endRelativeY ? { relativeY: endRelativeY } : {}),
	};

	const connectorData: ConnectorData & { id: string } = {
		id: el.id,
		itemType: "Connector",
		transformation,
		startPoint,
		endPoint,
		startPointerStyle:
			(el.getAttribute(
				"data-start-pointer-style",
			) as ConnectorPointerStyle) || "None",
		endPointerStyle:
			(el.getAttribute(
				"data-end-pointer-style",
			) as ConnectorPointerStyle) || "None",
		lineStyle:
			(el.getAttribute("data-line-style") as ConnectorLineStyle) ||
			"straight",
		lineColor: el.getAttribute("data-line-color") || "",
		lineWidth: parseInt(
			el.getAttribute("data-line-width") || "1",
		) as ConnectionLineWidth,
		borderStyle:
			(el.getAttribute("data-border-style") as BorderStyle) || "",
		text: new DefaultRichTextData(),
		linkTo: new LinkTo(),
	};

	const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
	if (textElement) {
		connectorData.text = parseHTMLRichText(textElement as HTMLElement, {
			insideOf: "Connector",
			realTransformation: transformation,
		});
	}

	return connectorData;
}
