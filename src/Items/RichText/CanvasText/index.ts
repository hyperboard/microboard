import * as flow from "dropflow";
import { Descendant } from "slate";
import { BlockNode } from "../Editor/BlockNode";
import { DEFAULT_TEXT_STYLES, loadFonts } from "View/Items/RichText";

const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/;

await loadFonts();

function getActualWidth(
	text: string,
	style: flow.DeclaredStyle,
	maxWidth: number,
): number {
	const line = trimTextToFitWidth(text, style, maxWidth);
	return measureText(line, style).width;
}

function trimTextToFitWidth(
	text: string,
	style: flow.DeclaredStyle,
	maxWidth: number,
): string {
	const measureTextWidth = (text: string): number =>
		measureText(text, style).width;

	let start = 0;
	let end = text.length;
	let bestFit = "";

	while (start <= end) {
		const mid = Math.floor((start + end) / 2);
		const substring = text.slice(0, mid);
		const width = measureTextWidth(substring);

		if (width <= maxWidth) {
			bestFit = substring;
			start = mid + 1;
		} else {
			end = mid - 1;
		}
	}

	return bestFit;
}

interface DropflowNodeData {
	style: flow.DeclaredStyle;
	children: DropflowChild[];
}

interface DropflowChild {
	style: flow.DeclaredStyle;
	text: string;
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
				width: maxWidth,
			};

			const children = node.children.map(child => {
				const childStyle: flow.DeclaredStyle = {
					fontWeight: child.bold ? 800 : 400,
					fontStyle: child.italic ? "italic" : "normal",
					// textDecoration: child.underline ? 'underline' : child['line-through'] ? 'line-through' : 'none',
					color:
						child.fontColor && rgbRegex.test(child.fontColor)
							? (() => {
									const match =
										child.fontColor.match(rgbRegex);
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
					whiteSpace: "pre-wrap",
					overflowWrap: "break-word",
					backgroundColor:
						child.fontHighlight &&
						rgbRegex.test(child.fontHighlight)
							? (() => {
									const match =
										child.fontHighlight.match(rgbRegex);
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
					// lineHeight: "normal",
				};
				return { style: childStyle, text: child.text };
			});

			dropflowNodes.push({ style: paragraphStyle, children });
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

export function getBlockNodes(
	data: Descendant[],
	maxWidth: number,
): LayoutBlockNodes {
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
			// console.log("SCALE", scale);
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
