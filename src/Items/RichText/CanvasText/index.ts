import * as flow from "dropflow";
import { Descendant } from "slate";
import { BlockNode } from "../Editor/BlockNode";
import { DEFAULT_TEXT_STYLES, loadFonts } from "View/Items/RichText";
import { TextNode } from "../Editor/TextNode";

const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;

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
		fontSize: child.fontSize || 14,
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
		lineHeight: { value: 1.4, unit: null },
	};
}

function convertSlateToDropflow(
	slateNodes: BlockNode[],
	maxWidth: number,
): DropflowNodeData[] {
	const dropflowNodes: DropflowNodeData[] = [];

	for (const node of slateNodes) {
		if (node.type === "paragraph") {
			const paragraphStyle: flow.DeclaredStyle = {
				textAlign: node.horisontalAlignment || "left",
				width: maxWidth === Infinity ? "auto" : maxWidth,
			};

			for (const child of node.children) {
				const childStyle = getChildStyle(child, maxWidth);
				const textParts = child.text.split("\n");

				textParts.forEach(text =>
					dropflowNodes.push({
						style: paragraphStyle,
						children: [{ style: childStyle, text }],
					}),
				);
			}
		}
	}

	return dropflowNodes;
}

function createFlowDivs(
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
	data: Descendant[],
	maxWidth: number,
): LayoutBlockNodes {
	const text = data[0].type === "paragraph" ? data[0].children[0].text : "";
	const newData: Descendant = JSON.parse(JSON.stringify(data[0]));
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
	data: Descendant[],
	maxWidth: number,
	shrink = false,
	isFrame?: boolean,
): LayoutBlockNodes {
	if (isFrame && data[0].type === "paragraph") {
		return sliceTextByWidth(data, maxWidth);
	}

	if (shrink) {
		const singleLineLayout = getBlockNodes(data, Infinity);
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
		const oneSymbolWidth =
			data[0].type === "paragraph" &&
			typeof data[0].children[0].fontSize === "number" &&
			getCharacterWidth(
				data[0].children[0].fontSize,
				data[0].children[0].fontFamily,
			);
		return getBlockNodes(data, bestWidth || oneSymbolWidth || bestWidth);
	}
	const dropflowNodes = convertSlateToDropflow(data, maxWidth);
	const divs = createFlowDivs(dropflowNodes);

	const rootElement = flow.dom(divs);

	const generated = flow.generate(rootElement);
	flow.layout(generated);
	let width = 0;
	let height = 0;
	for (const span of generated.containingBlock.box.children) {
		if (span.isBlockContainer()) {
			if (span.contentArea.width > width) {
				width = span.contentArea.width;
			}
			height += span.contentArea.height;
		}
	}

	return {
		// nodes: dropflowNodes,
		nodes: [],
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
function getCharacterWidth(fontSize, fontFamily, character = "a"): number {
	context.font = `${fontSize}px ${fontFamily}`;
	const metrics = context.measureText(character);
	return metrics.width;
}

function measureText(fontSize, fontFamily, text): TextMetrics {
	context.font = `${fontSize}px ${fontFamily}`;
	return context.measureText(text);
}

function findMinimumWidthForSingleLineHeight(
	data: Descendant[],
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
