import * as flow from "dropflow";
import { Descendant } from "slate";
import {
	BlockNode,
	BulletedListNode,
	NumberedListNode,
} from "../Editor/BlockNode";
import { DEFAULT_TEXT_STYLES } from "View/Items/RichText";
import { LinkNode, TextNode } from "../Editor/TextNode";
import { getPublicUrl } from "Config";

const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;

async function loadFonts(): Promise<void> {
	await flow.registerFont(
		new URL(getPublicUrl("/fonts/OpenSans-Regular.ttf")),
	);
	await flow.registerFont(new URL(getPublicUrl("/fonts/OpenSans-Bold.ttf")));
	await flow.registerFont(
		new URL(getPublicUrl("/fonts/OpenSans-Italic.ttf")),
	);
	await flow.registerFont(
		new URL(getPublicUrl("/fonts/OpenSans-BoldItalic.ttf")),
	);
	await flow.registerFont(
		new URL(getPublicUrl("/fonts/RobotoMono-Regular.ttf")),
	);
	await flow.registerFont(
		new URL(getPublicUrl("/fonts/NotoColorEmoji-Regular.ttf")),
	);
}

await loadFonts();

interface DropflowNodeData {
	style: flow.DeclaredStyle;
	children: DropflowChild[];
}

interface DropflowChild {
	style: flow.DeclaredStyle;
	text: string;
}

interface ListCreationData {
	isNumberedList: boolean;
	listLevel: number;
	index: number;
	nodeIndex?: number;
}

interface DropflowNodeWithType {
	type: string;
	nodes: DropflowNodeData[];
}

// needed while we cant create hyperlink
const convertLinkNodeToTextNode = (node: LinkNode | TextNode): TextNode => {
	if (node.type === "text" || !node.type) {
		return node;
	}
	const link = node.link;
	const nodeCopy = { ...node };
	delete nodeCopy.children;
	return { ...nodeCopy, type: "text", text: link };
};

function getChildStyle(
	child: TextNode | LinkNode,
	maxWidth: number,
): flow.DeclaredStyle {
	const fontSize = typeof child.fontSize === "number" ? child.fontSize : 14;
	return {
		fontWeight: child.bold ? 800 : 400,
		fontStyle: child.italic ? "italic" : "normal",
		color:
			child.fontColor && rgbRegex.test(child.fontColor)
				? (() => {
						const match = child.fontColor.match(rgbRegex);
						return match
							? {
									r: parseInt(match[1]),
									g: parseInt(match[2]),
									b: parseInt(match[3]),
									a: 1,
								}
							: { r: 0, g: 0, b: 0, a: 1 };
					})()
				: { r: 0, g: 0, b: 0, a: 1 },
		fontSize,
		fontFamily: [DEFAULT_TEXT_STYLES.fontFamily, "Noto Color Emoji"],
		whiteSpace: maxWidth === Infinity ? "nowrap" : "pre-wrap",
		overflowWrap: "break-word",
		backgroundColor:
			child.fontHighlight && rgbRegex.test(child.fontHighlight)
				? (() => {
						const match = child.fontHighlight.match(rgbRegex);
						return match
							? {
									r: parseInt(match[1]),
									g: parseInt(match[2]),
									b: parseInt(match[3]),
									a: 1,
								}
							: "transparent";
					})()
				: "transparent",
		lineHeight: {
			value: 1.4,
			unit: null,
		},
	};
}

function convertNoneListNode(
	node: BlockNode,
	maxWidth: number,
	isFirstNode: boolean,
): DropflowNodeData[] {
	const newDropflowNodes: DropflowNodeData[] = [];
	let padding = 0;
	if (
		!isFirstNode &&
		(node.type === "heading_one" ||
			node.type === "heading_two" ||
			node.type === "heading_three" ||
			node.type === "heading_four" ||
			node.type === "heading_five" ||
			node.type === "paragraph")
	) {
		padding = 0.5;
	}

	const nodeStyle: flow.DeclaredStyle = {
		textAlign: node.horisontalAlignment || "left",
		fontFamily: [DEFAULT_TEXT_STYLES.fontFamily, "Noto Color Emoji"],
		paddingTop: { value: padding, unit: "em" },
	};

	let currNode: DropflowNodeData = {
		style: nodeStyle,
		children: [],
	};

	for (const child of node.children) {
		const childStyle = getChildStyle(child, maxWidth);
		if (node.type === "code_block") {
			childStyle.fontWeight = 400;
			childStyle.fontFamily = ["Roboto Mono", "monospace"];
		}

		const textParts = convertLinkNodeToTextNode(child).text.split("\n");

		if (textParts.length === 1) {
			currNode.children.push({
				style: childStyle,
				text: textParts[0],
			});
		} else {
			currNode.children.push({
				style: childStyle,
				text: textParts[0],
			});
			newDropflowNodes.push(currNode);

			textParts.forEach((text, idx) => {
				if (idx > 0 && idx < textParts.length - 1) {
					newDropflowNodes.push({
						style: nodeStyle,
						children: [{ style: childStyle, text }],
					});
				}
			});
			currNode = {
				style: nodeStyle,
				children: [
					{
						text: textParts[textParts.length - 1],
						style: childStyle,
					},
				],
			};
		}
	}
	newDropflowNodes.push(currNode);
	return newDropflowNodes;
}

function convertListNode(
	node: BulletedListNode | NumberedListNode,
	maxWidth: number,
): { type: string; nodes: DropflowNodeData[] | DropflowNodeWithType[] }[][] {
	const newDropflowListNodes: {
		type: string;
		nodes: DropflowNodeData[] | DropflowNodeWithType[];
	}[][] = [];

	for (const listItem of node.children) {
		newDropflowListNodes.push(
			convertSlateToDropflow(listItem.children, maxWidth, true),
		);
	}
	return newDropflowListNodes;
}

function convertSlateToDropflow(
	slateNodes: BlockNode[],
	maxWidth: number,
	areNodesFromList = false,
) {
	const dropflowNodes: {
		type: string;
		nodes: DropflowNodeData[] | DropflowNodeWithType[];
	}[] = [];
	for (let i = 0; i < slateNodes.length; i++) {
		const node = slateNodes[i];
		switch (node.type) {
			case "heading_one":
			case "heading_two":
			case "heading_three":
			case "heading_four":
			case "heading_five":
			case "paragraph":
				dropflowNodes.push({
					type: "paragraphNodes",
					nodes: convertNoneListNode(
						node,
						maxWidth,
						i === 0 && !areNodesFromList,
					),
				});
				break;
			case "code_block":
				dropflowNodes.push({
					type: "codeNodes",
					nodes: convertNoneListNode(
						node,
						maxWidth,
						i === 0 && !areNodesFromList,
					),
				});
				break;
			case "ol_list":
				dropflowNodes.push({
					type: "numberedListNodes",
					nodes: convertListNode(node, maxWidth),
				});
				break;
			case "ul_list":
				dropflowNodes.push({
					type: "bulletedListNodes",
					nodes: convertListNode(node, maxWidth),
				});
				break;
		}
	}

	return dropflowNodes;
}

function createRootDiv(
	children: flow.HTMLElement[],
	maxWidth: number,
): flow.HTMLElement {
	return flow.h(
		"div",
		{
			style: {
				lineHeight: 1.4,
				width: maxWidth === Infinity ? "auto" : maxWidth,
				fontFamily: [
					DEFAULT_TEXT_STYLES.fontFamily,
					"Noto Color Emoji",
				],
			},
		},
		children,
	);
}

function createFlowDiv(
	dropflowNodes: {
		style: flow.DeclaredStyle;
		children: { style: flow.DeclaredStyle; text: string }[];
	}[],
	listData: ListCreationData | null = null,
): flow.HTMLElement[] {
	return dropflowNodes.map(paragraph =>
		flow.h(
			"div",
			{ style: paragraph.style },
			getChildSpanElements(paragraph, listData, listData?.nodeIndex || 0),
		),
	);
}

function getChildSpanElements(
	paragraph: {
		style: flow.DeclaredStyle;
		children: { style: flow.DeclaredStyle; text: string }[];
	},
	listData: ListCreationData | null,
	nodeIndex: number,
) {
	const childElements: flow.HTMLElement[] = [];
	if (listData && nodeIndex === 0) {
		const paddingLeft =
			listData.listLevel > 1 ? (listData.listLevel - 1) * 2.5 : 0;
		childElements.push(
			flow.h(
				"span",
				{
					style: {
						...paragraph.children[0].style,
						paddingLeft: { value: paddingLeft, unit: "em" },
					},
				},
				[getListMark(listData.isNumberedList, listData.index)],
			),
		);
	}

	for (let i = 0; i < paragraph.children.length; i++) {
		const child = paragraph.children[i];
		const text = child.text;
		childElements.push(flow.h("span", { style: child.style }, [text]));
	}

	return childElements;
}

function getListMark(isNumberedList: boolean, listItemIndex: number) {
	let mark = "";
	if (isNumberedList) {
		mark += (listItemIndex + 1).toString() + ". ";
	} else {
		mark += "•  ";
	}

	return mark;
}

function createFlowList(
	dropflowNodes: DropflowNodeWithType[],
	isNumberedList: boolean,
	listData: ListCreationData | null = null,
): flow.HTMLElement {
	return flow.h(
		"div",
		{},
		dropflowNodes.map((listItem, listItemIndex) => {
			let listCreationData: null | ListCreationData = null;
			if (listData) {
				listCreationData = {
					...listData,
					listLevel: listData.listLevel + 1,
					index: listItemIndex,
				};
			} else {
				listCreationData = {
					listLevel: 1,
					isNumberedList,
					index: listItemIndex,
				};
			}
			return flow.h(
				"div",
				{},
				getElementsByNodes(listItem, listCreationData),
			);
		}),
	);
}

export interface LayoutBlockNodes {
	nodes: [];
	maxWidth: number;
	width: number;
	height: number;
	render: (ctx: CanvasRenderingContext2D, scale?: number) => void;
	// should remove?
	realign: (newMaxWidht: number) => void;
	// should remove?
	recoordinate: (newMaxWidth?: number) => void;
}

function sliceTextByWidth(
	data: BlockNode[],
	maxWidth: number,
): LayoutBlockNodes {
	const text =
		data[0].type === "paragraph"
			? convertLinkNodeToTextNode(data[0].children[0]).text
			: "";
	const newData: BlockNode = JSON.parse(JSON.stringify(data[0]));
	let currentText = "";
	let currentWidth = 0;

	for (let i = 0; i < text.length; i++) {
		currentText += text[i];
		currentWidth =
			(data[0].type &&
				typeof data[0].children[0].fontSize === "number" &&
				measureText(
					data[0].children[0].fontSize,
					data[0].children[0].fontFamily,
					currentText + "...",
				).width) ||
			0;

		if (currentWidth > maxWidth) {
			currentText = currentText.slice(0, -3) + "...";
			break;
		}
	}

	if (newData.type === "paragraph") {
		convertLinkNodeToTextNode(newData.children[0]).text = currentText;
	}

	return getBlockNodes([newData], maxWidth);
}

function getElementsByNodes(
	dropflowNodes: {
		type: string;
		nodes: DropflowNodeData[] | DropflowNodeWithType[];
	}[],
	listData: ListCreationData | null = null,
) {
	return dropflowNodes.flatMap((node, index) => {
		let listCreationData: null | ListCreationData = null;
		if (listData) {
			if (index > 0) {
				listCreationData = { ...listData, nodeIndex: index };
			} else {
				listCreationData = { ...listData, nodeIndex: index };
			}
		}

		switch (node.type) {
			case "numberedListNodes": {
				return createFlowList(node.nodes, true, listCreationData);
			}
			case "bulletedListNodes": {
				return createFlowList(node.nodes, false, listCreationData);
			}
			default:
				return createFlowDiv(node.nodes, listCreationData);
		}
	});
}

export function getBlockNodes(
	data: BlockNode[],
	maxWidth: number,
	shrink = false,
	isFrame?: boolean,
): LayoutBlockNodes {
	if (isFrame && data[0].type === "paragraph") {
		return sliceTextByWidth(data, maxWidth);
	}

	if (shrink) {
		const filledEmptys = data.map(
			des =>
				(des.type === "paragraph" && {
					...des,
					children: des.children.map(child => ({
						...child,
						text:
							child.text?.length !== 0
								? child.text
								: child.link
									? child.link
									: "1",
					})),
				}) ||
				des,
		);

		// non emptys width is calculated correctly
		const singleLineLayout = getBlockNodes(filledEmptys, Infinity);
		const singleLineHeight = singleLineLayout.height;

		const maxWidthLayout = getBlockNodes(data, maxWidth);
		const maxWidthHeight = maxWidthLayout.height;

		// If the height with maxWidth is greater than the single line height, return the maxWidth layout
		if (maxWidthHeight > singleLineHeight) {
			return maxWidthLayout;
		}

		const bestWidth = findMinimumWidthForSingleLineHeight(
			data,
			singleLineHeight,
			maxWidth,
		);
		const biggestOneSymbolWidth = getOneCharacterMaxWidth(data);

		return getBlockNodes(
			data,
			bestWidth > biggestOneSymbolWidth
				? bestWidth
				: biggestOneSymbolWidth,
		);
	}
	const dropflowNodes = convertSlateToDropflow(data, maxWidth);

	const rootDiv = createRootDiv(getElementsByNodes(dropflowNodes), maxWidth);

	const rootElement = flow.dom(rootDiv);

	const generated = flow.generate(rootElement);
	flow.layout(generated);
	let width = 0;
	let height = 0;
	for (const span of generated.children[0].containingBlock.box.children) {
		if (span.isBlockContainer()) {
			if (span.contentArea.width > width) {
				width = span.contentArea.width;
			}
			height += span.contentArea.height;
		}
	}

	return {
		// nodes: dropflowNodes,
		nodes: generated,
		maxWidth,
		width,
		height,
		render: (ctx: CanvasRenderingContext2D, scale?: number) => {
			if (scale) {
				ctx.scale(scale, scale);
			}
			const canvas = ctx.canvas;
			flow.renderToCanvas(rootElement, canvas);
			if (scale) {
				ctx.scale(1 / scale, 1 / scale);
			}
		},
		realign: (newMaxWidth: number) => {
			// Implement realign logic if needed
		},
		recoordinate: (newMaxWidth?: number) => {
			// Implement recoordinate logic if needed
		},
	};
}

const canvas = document.createElement("canvas");
const context = canvas.getContext("2d") as CanvasRenderingContext2D;

function getOneCharacterMaxWidth(data: Descendant[]): number {
	let maxWidth = 0;

	for (const desc of data) {
		if ("children" in desc) {
			for (const child of desc.children) {
				if (
					child.type === "text" &&
					typeof child.fontSize === "number" &&
					convertLinkNodeToTextNode(child).text.length === 1
				) {
					const bold = (child.bold && "bold") || "";
					const italic = (child.italic && "italic") || "";
					context.font = `${bold} ${italic} ${child.fontSize}px ${child.fontFamily}`;
					const metrics = context.measureText(
						convertLinkNodeToTextNode(child).text,
					);
					if (metrics.width > maxWidth) {
						maxWidth = metrics.width;
					}
				} else if ("children" in child) {
					const currWidth = getOneCharacterMaxWidth(
						child.children || [],
					);
					if (currWidth > maxWidth) {
						maxWidth = currWidth;
					}
				}
			}
		}
	}

	return maxWidth;
}

function measureText(fontSize, fontFamily, text): TextMetrics {
	context.font = `${fontSize}px ${fontFamily}`;
	return context.measureText(text);
}

function findMinimumWidthForSingleLineHeight(
	data: BlockNode[],
	singleLineHeight: number,
	maxWidth: number,
): number {
	let low = 0;
	let high = maxWidth;
	let bestWidth = maxWidth;

	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		const midLayout = getBlockNodes(data, mid);
		const midHeight = midLayout.height;

		if (midHeight > singleLineHeight) {
			low = mid + 1;
		} else {
			bestWidth = mid;
			high = mid - 1;
		}
	}

	return bestWidth;
}
