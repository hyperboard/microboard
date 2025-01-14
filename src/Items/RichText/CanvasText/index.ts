import * as flow from "dropflow";
import { Descendant } from "slate";
import {
	BlockNode,
	BulletedListNode,
	NumberedListNode,
} from "../Editor/BlockNode";
import { DEFAULT_TEXT_STYLES } from "View/Items/RichText";
import { TextNode } from "../Editor/TextNode";
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

function getChildStyle(child: TextNode, maxWidth: number): flow.DeclaredStyle {
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
		fontFamily: [DEFAULT_TEXT_STYLES.fontFamily],
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
): DropflowNodeData[] {
	const newDropflowNodes: DropflowNodeData[] = [];

	const paragraphStyle: flow.DeclaredStyle = {
		textAlign: node.horisontalAlignment || "left",
		fontFamily: [DEFAULT_TEXT_STYLES.fontFamily],
	};

	let currNode: DropflowNodeData = {
		style: paragraphStyle,
		children: [],
	};

	for (const child of node.children) {
		const childStyle = getChildStyle(child, maxWidth);
		if (node.type === "code_block") {
			childStyle.fontWeight = 400;
			childStyle.fontFamily = ["Roboto Mono", "monospace"];
		}

		let textParts = [""];
		if (child.text && child.text.length !== 0) {
			textParts = child.text.split("\n");
		} else if (child.link) {
			textParts = child.link.split("\n");
		}
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
						style: paragraphStyle,
						children: [{ style: childStyle, text }],
					});
				}
			});
			currNode = {
				style: paragraphStyle,
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
): DropflowNodeData[] {
	const newDropflowListNodes: DropflowNodeData[] = [];

	for (const listItem of node.children) {
		for (const child of listItem.children) {
			newDropflowListNodes.push(...convertNoneListNode(child, maxWidth));
		}
	}
	return newDropflowListNodes;
}

function convertSlateToDropflow(slateNodes: BlockNode[], maxWidth: number) {
	const dropflowNodes: { type: string; nodes: DropflowNodeData[] }[] = [];
	for (const node of slateNodes) {
		switch (node.type) {
			case "heading_one":
			case "heading_two":
			case "heading_three":
			case "paragraph":
				dropflowNodes.push({
					type: "paragraphNodes",
					nodes: convertNoneListNode(node, maxWidth),
				});
				break;
			case "code_block":
				dropflowNodes.push({
					type: "codeNodes",
					nodes: convertNoneListNode(node, maxWidth),
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
				fontFamily: [DEFAULT_TEXT_STYLES.fontFamily],
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
): flow.HTMLElement[] {
	return dropflowNodes.map(paragraph =>
		flow.h(
			"div",
			{ style: paragraph.style },
			paragraph.children.map(child =>
				flow.h("span", { style: child.style }, [child.text]),
			),
		),
	);
}

function createFlowList(
	dropflowNodes: {
		style: flow.DeclaredStyle;
		children: { style: flow.DeclaredStyle; text: string }[];
	}[],
	isNumberedList: boolean,
): flow.HTMLElement {
	return flow.h(
		"div",
		{},
		dropflowNodes.map((listItem, listItemIndex) =>
			flow.h(
				"div",
				{ style: listItem.style },
				listItem.children.map((child, childIndex) => {
					let mark: string = "";
					if (childIndex === 0) {
						if (isNumberedList) {
							mark = (listItemIndex + 1).toString() + ". ";
						} else {
							mark = "• ";
						}
					}
					return flow.h("span", { style: child.style }, [
						mark + child.text,
					]);
				}),
			),
		),
	);
}

function createFlowCode(
	dropflowNodes: {
		style: flow.DeclaredStyle;
		children: { style: flow.DeclaredStyle; text: string }[];
	}[],
): flow.HTMLElement[] {
	return dropflowNodes.map(listItem =>
		flow.h(
			"div",
			{ style: listItem.style },
			listItem.children.map(child =>
				flow.h("span", { style: child.style }, [child.text]),
			),
		),
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
	const text = data[0].type === "paragraph" ? data[0].children[0].text : "";
	const newData: BlockNode = JSON.parse(JSON.stringify(data[0]));
	let currentText = "";
	let currentWidth = 0;

	for (let i = 0; i < text.length; i++) {
		currentText += text[i];
		currentWidth =
			(data[0].type === "paragraph" &&
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
		newData.children[0].text = currentText;
	}

	return getBlockNodes([newData], maxWidth);
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
		const biggetOneSymbolWidth = getOneCharacterMaxWidth(data);

		return getBlockNodes(
			data,
			bestWidth > biggetOneSymbolWidth ? bestWidth : biggetOneSymbolWidth,
		);
	}
	const dropflowNodes = convertSlateToDropflow(data, maxWidth);
	const childNodes = dropflowNodes.flatMap(node => {
		switch (node.type) {
			case "paragraphNodes": {
				return createFlowDiv(node.nodes);
			}
			case "codeNodes": {
				return createFlowCode(node.nodes);
			}
			case "numberedListNodes": {
				return createFlowList(node.nodes, true);
			}
			case "bulletedListNodes": {
				return createFlowList(node.nodes, false);
			}
			default:
				return createFlowDiv(node.nodes);
		}
	});

	const rootDiv = createRootDiv(childNodes, maxWidth);

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
		if (desc.type !== "paragraph") {
			continue;
		}

		for (const child of desc.children) {
			if (typeof child.fontSize === "number" && child.text.length === 1) {
				const bold = (child.bold && "bold") || "";
				const italic = (child.italic && "italic") || "";
				context.font = `${bold} ${italic} ${child.fontSize}px ${child.fontFamily}`;
				const metrics = context.measureText(child.text);
				if (metrics.width > maxWidth) {
					maxWidth = metrics.width;
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
