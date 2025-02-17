import { BlockNode } from "../Editor/BlockNode";
import { TextNode } from "../Editor/TextNode";
import { LayoutBlockNodes } from "./LayoutBlockNodes";

type Ctx = CanvasRenderingContext2D;

export function getBlockNodes(
	data: BlockNode[],
	maxWidth = Infinity,
	shrink = false,
	isFrame = false, // Smell
): LayoutBlockNodes {
	const nodes: LayoutBlockNode[] = [];
	let didBreakWords = false;
	for (const node of data) {
		const blockNode = getBlockNode(node, maxWidth, isFrame);
		nodes.push(blockNode);
	}
	for (const node of nodes) {
		didBreakWords = didBreakWords || node.didBreakWords;
	}
	setBlockNodesCoordinates(nodes);
	let width = 0;
	let height = 0;
	for (const node of nodes) {
		width = Math.max(width, node.width);
		height += node.height;
	}

	function alignNodes(maxWidth: number): void {
		align(nodes, maxWidth);
	}

	alignNodes(maxWidth);

	return {
		nodes,
		maxWidth,
		width,
		height,
		didBreakWords,
		render: (ctx, scale?: number) => {
			renderBlockNodes(ctx, nodes, scale);
		},
		realign: (newMaxWidth: number) => {
			alignNodes(newMaxWidth);
		},
		recoordinate: (newMaxWidth?: number) => {
			nodes.forEach(node => {
				setBlockNodeCoordinates(node);
			});
			setBlockNodesCoordinates(nodes);
			if (newMaxWidth) {
				alignNodes(newMaxWidth);
			} else {
				alignNodes(maxWidth);
			}
		},
	};
}

interface LayoutBlockNode {
	type:
		| "paragraph"
		| "heading_one"
		| "heading_two"
		| "heading_three"
		| "heading_four"
		| "heading_five"
		| "code_block"
		| "bulleted-list"
		| "numbered-list"
		| "list-item"
		| "text";
	lineHeight: number;
	children: LayoutTextNode[];
	lines: LayoutTextBlock[][];
	align: "left" | "center" | "right" | undefined;
	width: number;
	height: number;
	didBreakWords: boolean;
}

const sliceTextByWidth = (
	textChild: TextNode,
	maxWidth: number,
): LayoutTextNode => {
	const textNode = getTextNode(textChild);
	const text = textNode.text;
	const textStyle = getTextStyle(textChild).font;
	let currentText = "";
	let currentWidth = 0;

	for (let i = 0; i < text.length; i++) {
		const nextText = currentText + text[i];
		const nextWidth = measureText(nextText + "...", textStyle).width;
		currentWidth = nextWidth;

		if (nextWidth > maxWidth) {
			break;
		}

		currentText = nextText;
	}

	textNode.text =
		currentWidth > maxWidth - 5 ? currentText + "..." : currentText;
	return textNode;
};

function getBlockNode(
	data: BlockNode,
	maxWidth: number,
	isFrame?: boolean, // Smell
): LayoutBlockNode {
	const node: LayoutBlockNode = {
		type: data.type,
		lineHeight: 1.4,
		children: [],
		lines: [],
		align: data.horisontalAlignment,
		width: 0,
		height: 0,
		didBreakWords: false,
	};
	for (const child of data.children) {
		switch (child.type) {
			case "bulleted-list":
			case "numbered-list":
			case "list-item":
				getBlockNode(child, maxWidth); // TODO lists
				break;
			case "text":
				handleTextNode(isFrame, child, maxWidth, node);
				break;
			default:
				if (typeof child.text === "string") {
					handleTextNode(isFrame, child, maxWidth, node);
				}
				break;
		}
	}

	layoutBlockNode(node, maxWidth);

	return node;
}

interface LayoutTextNode {
	type: string;
	text: string;
	style: LeafStyle;
	blocks: never[];
}

function handleTextNode(
	isFrame: boolean | undefined,
	child: TextNode,
	maxWidth: number,
	node: LayoutBlockNode,
): void {
	const newChild = isFrame
		? sliceTextByWidth(child, maxWidth)
		: getTextNode(child);
	node.children.push(newChild);
}

function getTextNode(data: TextNode): LayoutTextNode {
	const text = data.text.length === 0 ? "\u00A0" : data.text;
	const node = {
		type: "text",
		text,
		style: getTextStyle(data),
		blocks: [],
	};
	return node;
}

interface LeafStyle {
	fontStyle: string;
	fontWeight: string;
	color: string;
	backgroundColor: string | undefined;
	fontSize: number;
	fontFamily: string;
	textDecorationLine?: "underline";
	crossed?: "line-through";
	verticalAlign?: "super" | "sub";
	font?: string;
}

function getTextStyle(data: TextNode): LeafStyle {
	const leafStyle: LeafStyle = {
		fontStyle: "normal",
		fontWeight: "normal",
		color: data.fontColor ?? "black",
		backgroundColor: data.fontHighlight,
		fontSize: data.fontSize ?? 14,
		fontFamily: data.fontFamily ?? "Arial",
	};

	const styles: string[] = [];

	if (data.bold) {
		styles.push("bold");
	}
	if (data.italic) {
		styles.push("italic");
	}
	if (data.underline) {
		styles.push("underline");
	}
	if (data.lineThrough) {
		styles.push("line-through");
	}
	if (data.subscript) {
		styles.push("subscript");
	}
	if (data.superscript) {
		styles.push("superscript");
	}
	for (const style of styles) {
		switch (style) {
			case "bold":
				leafStyle.fontWeight = "bold";
				break;
			case "italic":
				leafStyle.fontStyle = "italic";
				break;
			case "underline":
				leafStyle.textDecorationLine = "underline";
				break;
			case "line-through":
				leafStyle.crossed = "line-through";
				break;
			case "superscript":
				leafStyle.verticalAlign = "super";
				break;
			case "subscript":
				leafStyle.verticalAlign = "sub";
				break;
		}
	}
	leafStyle.font = getFont(leafStyle);
	return leafStyle;
}

const defaultStyle = getTextStyle({} as TextNode);

function getFont(style: LeafStyle): string {
	const fontStyle = style.fontStyle || "normal";
	const fontWeight = style.fontWeight || 400;
	const fontSize = style.fontSize || "14";
	const fontFamily = style.fontFamily || "Arial";
	const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
	return font;
}

function layoutBlockNode(blockNode: LayoutBlockNode, maxWidth: number): void {
	const lines: LayoutTextBlock[][] = [];
	for (const child of blockNode.children) {
		layoutTextNode(blockNode, lines, child, maxWidth);
	}
	blockNode.lines = lines;
	fillEmptyLines(blockNode);
	setBlockNodeCoordinates(blockNode);
}

function layoutTextNode(
	blockNode,
	lines: LayoutTextBlock[][],
	textNode: LayoutTextNode,
	maxWidth: number,
): void {
	// Check if textNode.text is empty. If it is, return since there is no text to process.
	if (textNode.text === "") {
		return;
	}

	// Check if the lines array is empty. If it is, add a new line to it.
	if (lines.length === 0) {
		lines.push([]);
	}

	const style = textNode.style;
	const nodeLines = textNode.text.split("\n");

	for (let nodeLine of nodeLines) {
		nodeLine = nodeLine.replace(/\t/g, "        ");
		// Create an array of words by using the splitWords function on the textNode.text.
		const words = splitTextIntoWords(nodeLine);

		// Create a variable to hold the current text string.
		let currentString = "";

		// Shift words from the words array and process each word.
		let hasWrapped = false;
		while (words.length > 0) {
			const word = words.shift();
			if (!word) {
				break;
			}
			const newText =
				currentString === "" ? word : currentString + "" + word;

			// Create a text block using the getTextBlock function with the current string.
			// The function will measure the text and set the text block width.
			const block = getTextBlock(newText, style);

			// Get the last line in the lines array and its width.
			const lastLine = lines[lines.length - 1];
			let lastLineWidth = 0;
			for (const block of lastLine) {
				lastLineWidth += block.width;
			}

			// Check if the newly created block's width, together with the width of the last line,
			// fits within the maxWidth.
			if (lastLineWidth + block.width <= maxWidth) {
				currentString = newText;
			} else {
				if (currentString === "") {
					// If the current string is empty, it means a single word does not fit the remaining width.
					if (lastLine.length === 0) {
						// If the last line is empty, a single word does not fit maxWidth and must be broken down.
						// Find the largest substring of the word that fits within the maxWidth.
						const substring = findLargestSubstring(
							word,
							style,
							maxWidth,
						);
						const remainingPart = word.slice(substring.length);

						// Create a new block with the substring.
						const newBlock = getTextBlock(substring, style);
						// Push the new block to the line.
						lastLine.push(newBlock);

						// Push a new line to the lines array.
						lines.push([]);

						hasWrapped = true;
						blockNode.didBreakWords = true;
						// Insert the remaining part of the word at the start of the words array.
						words.unshift(remainingPart);
					} else {
						// If the last line is not empty, we must attempt to fit the word into a new empty line.
						// Push a new line to the lines array.
						lines.push([]);

						hasWrapped = true;

						// Insert the current word back at the start of the words array.
						words.unshift(word);
					}
				} else {
					// If the current string is not empty, we can push it to the last line and create the next line.
					if (lastLine.length === 0 && hasWrapped) {
						currentString = currentString.trimStart();
					}

					// Create a text block from the current string.
					const newBlock = getTextBlock(currentString, style);

					// Push the new block to the last line.
					lastLine.push(newBlock);

					// Push a new empty line to the lines array.
					lines.push([]);

					hasWrapped = true;

					// Set the current string to an empty string.
					currentString = "";

					// Insert the current word back at the start of the words array.
					words.unshift(word);
				}
			}
		}

		// Push the last text block if it exists.
		if (currentString !== "") {
			const lastBlock = getTextBlock(currentString, style);
			lines[lines.length - 1].push(lastBlock);
		}

		// Push a new empty line to the lines array.
		lines.push([]);
	}

	if (lines[lines.length - 1].length === 0) {
		lines.pop();
	}
}

function fillEmptyLines(blockNode: LayoutBlockNode): void {
	for (let i = 0; i < blockNode.lines.length; i++) {
		const line = blockNode.lines[i];
		if (line.length === 0) {
			const previousLine = blockNode.lines[i - 1];
			let previousStyle = defaultStyle;
			if (previousLine !== undefined) {
				previousStyle = previousLine[previousLine.length - 1].style;
			}
			line.push(getTextBlock(" ", previousStyle ?? defaultStyle));
		}
	}
}

function setBlockNodeCoordinates(blockNode: LayoutBlockNode): void {
	const lines = blockNode.lines;
	const lineHeight = blockNode.lineHeight;
	// Update x and y coordinates of text blocks.
	let yOffset = 0;
	let lineBottom = 0;

	let maxWidth = 0;
	let totalHeight = 0;

	for (const line of lines) {
		let maxFontSize = 0;
		let highestBlock;
		let xOffset = 0;
		let leading = 0;

		if (line.length === 0) {
			continue;
		}

		for (const block of line) {
			block.x = xOffset;

			if (block.fontSize > maxFontSize || !highestBlock) {
				// maxFontSize = block.measure.height;
				maxFontSize = block.fontSize;
				highestBlock = block;
			}

			xOffset += block.width;
		}

		totalHeight += maxFontSize * lineHeight;

		if (xOffset > maxWidth) {
			maxWidth = xOffset;
		}

		lineBottom += maxFontSize * lineHeight;
		leading = maxFontSize * lineHeight - maxFontSize;
		yOffset = lineBottom - leading / 2 - highestBlock.measure.descent;

		for (const block of line) {
			block.y = yOffset;
		}
	}

	blockNode.width = maxWidth;
	blockNode.height = totalHeight;
}

interface LayoutTextBlock {
	text: string;
	style: LeafStyle;
	width: number;
	x: number;
	y: number;
	measure: MeasuredRect;
	fontSize: number;
}

function getTextBlock(text: string, style: LeafStyle): LayoutTextBlock {
	const measure = measureText(text, style);
	const textBlock = {
		text,
		style,
		width: measure.width,
		x: 0,
		y: 0,
		measure,
		fontSize: style.fontSize,
	};
	return textBlock;
}

function getMeasureCtx(): Ctx {
	const measureCanvas = document.createElement("canvas");
	const measureCtx = measureCanvas.getContext("2d");
	if (!measureCtx) {
		throw new Error("Failde to create canvas and get 2d context");
	}
	return measureCtx;
}

const measureCtx = getMeasureCtx();

const measureCache: Record<string, Record<string, MeasuredRect>> = {};

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && isFinite(value);
}

function toFiniteNumber(value: unknown, coerce = 0): number {
	return isFiniteNumber(value) ? value : coerce;
}

interface MeasuredRect {
	actualBoundingBoxAscent: number;
	actualBoundingBoxDescent: number;
	actualBoundingBoxLeft: number;
	actualBoundingBoxRight: number;
	fontBoundingBoxAscent: number;
	fontBoundingBoxDescent: number;
	ascent: number;
	descent: number;
	width: number;
	height: number;
}

function measureText(text: string, style): MeasuredRect {
	if (measureCache[style.font]) {
		if (measureCache[style.font][text]) {
			return measureCache[style.font][text];
		}
	}
	measureCtx.font = style.font;
	const measure = measureCtx.measureText(text);
	const actualBoundingBoxAscent = toFiniteNumber(
		measure.actualBoundingBoxAscent,
	);
	const actualBoundingBoxDescent = toFiniteNumber(
		measure.actualBoundingBoxDescent,
	);
	const actualBoundingBoxLeft = toFiniteNumber(measure.actualBoundingBoxLeft);
	const actualBoundingBoxRight = toFiniteNumber(
		measure.actualBoundingBoxRight,
	);
	const fontBoundingBoxAscent = toFiniteNumber(measure.fontBoundingBoxAscent);
	const fontBoundingBoxDescent = toFiniteNumber(
		measure.fontBoundingBoxDescent,
	);
	const width = toFiniteNumber(measure.width);
	const ascent = Math.max(fontBoundingBoxAscent, actualBoundingBoxAscent);
	const descent = Math.max(fontBoundingBoxDescent, actualBoundingBoxDescent);
	const rect = {
		actualBoundingBoxAscent,
		actualBoundingBoxDescent,
		actualBoundingBoxLeft,
		actualBoundingBoxRight,
		fontBoundingBoxAscent,
		fontBoundingBoxDescent,
		ascent,
		descent,
		width: Math.max(width, actualBoundingBoxLeft + actualBoundingBoxRight),
		height: ascent + descent,
	};
	if (!measureCache[style.font]) {
		measureCache[style.font] = {};
	}
	measureCache[style.font][text] = rect;
	return rect;
}

function splitTextIntoWords(text: string): string[] {
	// filter is important, do not remove
	return text.split(/(\s+)/).filter(element => element !== "");
}

function findLargestSubstring(word, style, maxWidth: number): string {
	// Use binary search to find the largest substring of the word that fits within the maxWidth.
	let start = 0;
	let end = word.length;
	let largestSubstring = "";

	while (start <= end) {
		// Calculate the middle index of the current range
		const mid = Math.floor((start + end) / 2);

		if (mid === 0) {
			// If mid is 0, the range is 0 to 0, so break out of the loop
			largestSubstring = word.slice(0, 1);
			break;
		}

		// Get the substring from the start of the word up to the middle index
		const substring = word.slice(0, mid);

		// Measure the width of the substring using the getTextBlock function
		const block = getTextBlock(substring, style);

		if (block.width <= maxWidth) {
			// If the substring width is less than or equal to maxWidth, update largestSubstring
			largestSubstring = substring;

			// Search for a longer substring in the second half of the range
			start = mid + 1;
		} else {
			// If the substring width is greater than maxWidth, search for a shorter substring in the first half of the range
			end = mid - 1;
		}
	}

	return largestSubstring;
}

function setBlockNodesCoordinates(nodes): void {
	let yOffset = 0;
	for (const node of nodes) {
		for (const line of node.lines) {
			for (const block of line) {
				block.y += yOffset;
			}
		}
		yOffset += node.height;
	}
}

function align(nodes: LayoutBlockNode[], maxWidth: number, scale = 1): void {
	const maxNodeWidth = nodes.reduce((acc, node) => {
		if (node.width > acc) {
			return node.width;
		}
		return acc;
	}, -1);
	const alignnentWidth = maxWidth === Infinity ? maxNodeWidth : maxWidth;
	for (const node of nodes) {
		switch (node.align) {
			case "left":
				break;
			case "center":
				alignToCenter(node, alignnentWidth, scale);
				break;
			case "right":
				alignToRight(node, alignnentWidth, scale);
				break;
		}
	}
}

function alignToCenter(
	node: LayoutBlockNode,
	maxWidth: number,
	scale: number,
): void {
	for (const line of node.lines) {
		let lineWidth = 0;
		for (const block of line) {
			lineWidth += block.width * scale;
		}
		const xOffset = (maxWidth - lineWidth) / 2;
		for (const block of line) {
			block.x += xOffset / scale;
		}
	}
}

function alignToRight(
	node: LayoutBlockNode,
	maxWidth: number,
	scale: number,
): void {
	for (const line of node.lines) {
		let lineWidth = 0;
		for (const block of line) {
			lineWidth += block.width * scale;
		}
		const xOffset = maxWidth - lineWidth;
		for (const block of line) {
			block.x += xOffset / scale;
		}
	}
}

function renderBlockNodes(
	ctx: Ctx,
	nodes: LayoutBlockNode[],
	scale?: number,
): void {
	if (scale) {
		ctx.scale(scale, scale);
	}
	for (const node of nodes) {
		renderTextLines(ctx, node.lines);
	}
	if (scale) {
		ctx.scale(1 / scale, 1 / scale);
	}
}

function renderTextLines(ctx: Ctx, lines: LayoutTextBlock[][]): void {
	for (const line of lines) {
		for (const textBlock of line) {
			renderTextBlock(ctx, textBlock);
		}
	}
}

function renderTextBlock(ctx: Ctx, textBlock: LayoutTextBlock): void {
	ctx.font = textBlock.style.font ?? "Arial";
	fillHighlight(ctx, textBlock);
	underline(ctx, textBlock);
	cross(ctx, textBlock);
	fillText(ctx, textBlock);
}

function fillHighlight(ctx: Ctx, textBlock: LayoutTextBlock): void {
	if (!textBlock.style.backgroundColor || textBlock.text === "\u00A0") {
		// U+00a0 is empty, for not highlighting emptyLine
		return;
	}
	const measure = textBlock.measure;
	ctx.fillStyle = textBlock.style.backgroundColor;
	ctx.fillRect(
		textBlock.x,
		textBlock.y - measure.ascent,
		measure.width,
		measure.height,
	);
}

function underline(ctx: Ctx, textBlock: LayoutTextBlock): void {
	if (
		textBlock.style.textDecorationLine !== "underline" ||
		textBlock.text === "\u00A0"
	) {
		return;
	}
	const x = textBlock.x;
	const y = textBlock.y;
	const style = textBlock.style;
	const measure = textBlock.measure;
	const width = measure.width;
	const color = style.color;
	ctx.strokeStyle = color;
	ctx.lineWidth = textBlock.fontSize / 14;
	ctx.beginPath();
	ctx.moveTo(x, y + (2 * textBlock.fontSize) / 14); // 14 - default fontSize
	ctx.lineTo(x + width, y + (2 * textBlock.fontSize) / 14);
	ctx.stroke();
	ctx.strokeStyle = style.backgroundColor ?? "black";
	ctx.lineWidth = 2;
	// ctx.strokeText(textBlock.text, x, y);
}

function cross(ctx: Ctx, textBlock: LayoutTextBlock): void {
	if (
		textBlock.style.crossed !== "line-through" ||
		textBlock.text === "\u00A0"
	) {
		return;
	}
	const x = textBlock.x;
	const y = textBlock.y;
	const style = textBlock.style;
	const measure = textBlock.measure;
	const width = measure.width;
	const height = measure.height;
	const color = style.color;
	ctx.strokeStyle = color;
	ctx.lineWidth = textBlock.fontSize / 14;
	ctx.beginPath();
	ctx.moveTo(x, y - height / 4);
	ctx.lineTo(x + width, y - height / 4);
	ctx.stroke();
	ctx.strokeStyle = style.backgroundColor ?? "black";
	ctx.lineWidth = 2;
}

function fillText(ctx: Ctx, textBlock: LayoutTextBlock): void {
	const { text, style, x, y } = textBlock;
	ctx.fillStyle = style.color;
	ctx.fillText(text, x, y);
}
