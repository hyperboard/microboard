import { conf } from 'Settings';
import { BlockNode } from '../Editor/BlockNode';
import { TextNode } from '../Editor/TextNode';
import { LayoutBlockNodes } from './LayoutBlockNodes';

type Ctx = CanvasRenderingContext2D;

export function getBlockNodes(
	data: BlockNode[],
	maxWidth = Infinity,
	shrink = false,
	isFrame = false // Smell
): LayoutBlockNodes {
	const nodes: LayoutBlockNode[] = [];
	let didBreakWords = false;
	const linkPositions: {
		link: string;
		left: number;
		top: number;
		right: number;
		bottom: number;
	}[] = [];

	for (const node of data) {
		const blockNode = getBlockNode(node, maxWidth, isFrame);
		nodes.push(blockNode);
	}
	for (const node of nodes) {
		didBreakWords = didBreakWords || node.didBreakWords;
	}
	const paddingsSum = setBlockNodesCoordinates(nodes);
	let width = 0;
	let height = paddingsSum;
	for (const node of nodes) {
		width = Math.max(width, node.width);
		height += node.height;
		for (const line of node.lines) {
			for (const block of line) {
				if (block.link) {
					linkPositions.push({
						link: block.link,
						left: block.x,
						top: block.y - block.measure.ascent,
						right: block.width + block.x,
						bottom: block.y - block.measure.ascent + block.measure.height,
					});
				}
			}
		}
	}

	function alignNodes(maxWidth: number): void {
		align(nodes, maxWidth);
	}

	alignNodes(shrink ? width : maxWidth);
	// console.log(nodes);

	return {
		nodes,
		maxWidth,
		width,
		height,
		didBreakWords,
		linkPositions,
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

export interface LayoutBlockNode {
	type:
		| 'paragraph'
		| 'heading_one'
		| 'heading_two'
		| 'heading_three'
		| 'heading_four'
		| 'heading_five'
		| 'code_block'
		| 'ul_list'
		| 'ol_list'
		| 'list_item'
		| 'text';
	lineHeight: number;
	children: LayoutTextNode[];
	lines: LayoutTextBlock[][];
	align: 'left' | 'center' | 'right' | undefined;
	width: number;
	height: number;
	didBreakWords: boolean;
	paddingTop: number;
	marginLeft: number;
}

const sliceTextByWidth = (textChild: TextNode, maxWidth: number): LayoutTextNode => {
	const textNode = getTextNode(textChild);
	const text = textNode.text;
	const textStyle = getTextStyle(textChild).font;
	let currentText = '';
	let currentWidth = 0;

	for (let i = 0; i < text.length; i++) {
		const nextText = currentText + text[i];
		const nextWidth = measureText(nextText + '...', textStyle).width;
		currentWidth = nextWidth;

		if (nextWidth > maxWidth) {
			break;
		}

		currentText = nextText;
	}

	textNode.text = currentWidth > maxWidth - 5 ? currentText + '...' : currentText;
	return textNode;
};

function getListMarkType(depth: number) {
	const cycle = (depth - 1) % 3;

	switch (cycle) {
		case 0:
			return 'LISTMARK_NUMBERS';
		case 1:
			return 'LISTMARK_LETTERS';
		case 2:
			return 'LISTMARK_ROMAN';
		default:
			return 'LISTMARK_NUMBERS';
	}
}

function getBlockNode(
	data: BlockNode,
	maxWidth: number,
	isFrame?: boolean, // Smell
	listData?: { isNumberedList: boolean; level: number },
	listMark?: string,
	newLine = false
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
		paddingTop: 0,
		marginLeft: 0,
	};
	if (node.type === 'ol_list' && !listData) {
		listData = { level: 0, isNumberedList: true };
	} else if (node.type === 'ul_list' && !listData) {
		listData = { level: 0, isNumberedList: false };
	}
	const listMarks = conf[getListMarkType((listData?.level || 0) + 1)];
	for (let i = 0; i < data.children.length; i++) {
		const child = structuredClone(data.children[i]);
		switch (child.type) {
			case 'ol_list': {
				const currentListData = {
					isNumberedList: true,
					level: listData?.level || 0,
				};
				if (listData) {
					currentListData.level += 1;
				}
				const blockNode = getBlockNode(child, maxWidth, isFrame, currentListData);
				node.children = node.children.concat(blockNode.children);
				node.lines = node.lines.concat(blockNode.lines);
				break;
			}
			case 'ul_list': {
				const currentListData = {
					isNumberedList: false,
					level: listData?.level || 0,
				};
				if (listData) {
					currentListData.level += 1;
				}
				const blockNode = getBlockNode(child, maxWidth, isFrame, currentListData);
				node.children = node.children.concat(blockNode.children);
				node.lines = node.lines.concat(blockNode.lines);
				break;
			}
			case 'list_item': {
				let listMark = '';
				if (listData?.isNumberedList) {
					listMark += listMarks[i % 20];
				} else {
					listMark += '•';
				}

				const blockNode = getBlockNode(child, maxWidth, isFrame, listData, listMark);
				node.children = node.children.concat(blockNode.children);
				node.lines = node.lines.concat(blockNode.lines);
				break;
			}
			case 'text':
				const fontScale = (child.fontSize === 'auto' ? 14 : child.fontSize ?? 14) / 14;
				handleTextNode({
					isFrame,
					child,
					node,
					maxWidth,
					paddingTop: i === 0 ? 16 * (data.paddingTop || 0) : 0,
					marginLeft:
						(listData ? fontScale * 16 : 0) + (listData?.level || 0) * fontScale * 24,
					newLine: i === 0 ? newLine : false,
					listMark: i === 0 ? listMark : undefined,
					link: child.link,
				});
				break;
			default:
				if ('text' in child && typeof child.text === 'string') {
					const textNode = child as unknown as TextNode
					const fontScale = (textNode.fontSize === 'auto' ? 14 : textNode.fontSize ?? 14) / 14;
					handleTextNode({
						isFrame,
						child: textNode,
						node,
						maxWidth,
						paddingTop: i === 0 ? 16 * (data.paddingTop || 0) : 0,
						marginLeft:
							(listData ? fontScale * 16 : 0) +
							(listData?.level || 0) * fontScale * 24,
						newLine: i === 0 ? newLine : false,
						listMark: i === 0 ? listMark : undefined,
						link: textNode.link,
					});
				} else {
					const blockNode = getBlockNode(
						child,
						maxWidth,
						isFrame,
						listData,
						i === 0 ? listMark : undefined,
						true
					);
					node.children = node.children.concat(blockNode.children);
					node.lines = node.lines.concat(blockNode.lines);
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
	newLine: boolean;
	paddingTop?: number;
	marginLeft?: number;
	listMark?: string;
	link?: string;
}

function handleTextNode({
	isFrame,
	child,
	node,
	maxWidth,
	newLine = false,
	listMark,
	marginLeft,
	paddingTop,
	link,
}: {
	isFrame: boolean | undefined;
	child: TextNode;
	maxWidth: number;
	node: LayoutBlockNode;
	newLine?: boolean;
	paddingTop?: number;
	marginLeft?: number;
	listMark?: string;
	link?: string;
}): void {
	const newChild = isFrame ? sliceTextByWidth(child, maxWidth) : getTextNode(child);
	node.children.push({
		...newChild,
		newLine,
		paddingTop,
		marginLeft,
		listMark,
		link,
	});
}

function getTextNode(data: TextNode): LayoutTextNode {
	const text = data.text?.length === 0 ? '\u00A0' : data.text; // todo ?
	if (!text) {
		console.warn('Text is undefined!, HERE!');
		console.log('data - ', data);
	}
	const node = {
		type: 'text',
		text,
		style: getTextStyle(data),
		blocks: [],
		newLine: false,
	};
	return node;
}

interface LeafStyle {
	fontStyle: string;
	fontWeight: string;
	color: string;
	backgroundColor: string | undefined;
	fontSize: number | "auto";
	fontFamily: string;
	textDecorationLine?: 'underline';
	crossed?: 'line-through';
	verticalAlign?: 'super' | 'sub';
	font?: string;
}

function getTextStyle(data: TextNode): LeafStyle {
	const leafStyle: LeafStyle = {
		fontStyle: 'normal',
		fontWeight: 'normal',
		color: data.fontColor ?? 'black',
		backgroundColor: data.fontHighlight,
		fontSize: data.fontSize ?? 14,
		fontFamily: data.fontFamily ?? 'Arial',
	};

	const styles: string[] = [];

	if (data.bold) {
		styles.push('bold');
	}
	if (data.italic) {
		styles.push('italic');
	}
	if (data.underline) {
		styles.push('underline');
	}
	if (data['line-through']) {
		styles.push('line-through');
	}
	if (data.subscript) {
		styles.push('subscript');
	}
	if (data.superscript) {
		styles.push('superscript');
	}
	for (const style of styles) {
		switch (style) {
			case 'bold':
				leafStyle.fontWeight = 'bold';
				break;
			case 'italic':
				leafStyle.fontStyle = 'italic';
				break;
			case 'underline':
				leafStyle.textDecorationLine = 'underline';
				break;
			case 'line-through':
				leafStyle.crossed = 'line-through';
				break;
			case 'superscript':
				leafStyle.verticalAlign = 'super';
				break;
			case 'subscript':
				leafStyle.verticalAlign = 'sub';
				break;
		}
	}
	leafStyle.font = getFont(leafStyle);
	return leafStyle;
}

const defaultStyle = getTextStyle({} as TextNode);

function getFont(style: LeafStyle): string {
	const fontStyle = style.fontStyle || 'normal';
	const fontWeight = style.fontWeight || 400;
	const fontSize = style.fontSize || '14';
	const fontFamily = style.fontFamily || 'Arial';
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
	blockNode: LayoutBlockNode,
	lines: LayoutTextBlock[][],
	textNode: LayoutTextNode,
	maxWidth: number
): void {
	// Check if textNode.text is empty. If it is, return since there is no text to process.
	if (textNode.text === '') {
		return;
	}

	// Check if the lines array is empty. If it is, add a new line to it.
	if (lines.length === 0) {
		lines.push([]);
	}

	if (textNode.newLine) {
		if (lines.length > 0 && lines[lines.length - 1].length > 0) {
			lines.push([]);
		}
	}

	const style = textNode.style;
	const nodeLines = textNode.text.split('\n');

	for (let nodeLine of nodeLines) {
		let isFirstLineInNode = nodeLine === nodeLines[0];
		let listMark: string | undefined = undefined;
		if (isFirstLineInNode) {
			listMark = textNode.listMark;
		}
		nodeLine = nodeLine.replace(/\t/g, '        ');
		// Create an array of words by using the splitWords function on the textNode.text.
		const words = splitTextIntoWords(nodeLine);

		// Create a variable to hold the current text string.
		let currentString = '';

		// Shift words from the words array and process each word.
		let hasWrapped = false;
		while (words.length > 0) {
			const word = words.shift();
			if (!word) {
				break;
			}
			const newText = currentString === '' ? word : currentString + '' + word;

			// Get the last line in the lines array and its width.
			const lastLine = lines[lines.length - 1];

			// Create a text block using the getTextBlock function with the current string.
			// The function will measure the text and set the text block width.
			const block = getTextBlock({
				text: newText,
				style,
				paddingTop: textNode.paddingTop,
				marginLeft: lastLine.length ? 0 : textNode.marginLeft,
			});

			let lastLineWidth = 0;
			for (const block of lastLine) {
				lastLineWidth += block.width;
			}

			// Check if the newly created block's width, together with the width of the last line,
			// fits within the maxWidth.
			if (lastLineWidth + block.width <= maxWidth) {
				currentString = newText;
			} else {
				if (currentString === '') {
					// If the current string is empty, it means a single word does not fit the remaining width.
					if (lastLine.length === 0) {
						// If the last line is empty, a single word does not fit maxWidth and must be broken down.
						// Find the largest substring of the word that fits within the maxWidth.
						const substring = findLargestSubstring(
							word,
							style,
							maxWidth,
							textNode.marginLeft
						).firstPart;
						const remainingPart = word.slice(substring.length);

						// Create a new block with the substring.
						const newBlock = getTextBlock({
							text: substring,
							style,
							paddingTop: isFirstLineInNode ? textNode.paddingTop : 0,
							marginLeft: textNode.marginLeft,
							listMark: !hasWrapped ? listMark : undefined,
							link: textNode.link,
						});
						// Push the new block to the line.
						lastLine.push(newBlock);
						isFirstLineInNode = false;

						// Push a new line to the lines array.
						lines.push([]);

						hasWrapped = true;
						blockNode.didBreakWords = true;
						// Insert the remaining part of the word at the start of the words array.
						words.unshift(remainingPart);
					} else {
						const lastBlock = lastLine[lastLine.length - 1];
						let lineWidth = 0;
						lastLine.forEach((block, index) => {
							if (index < lastLine.length - 1) {
								lineWidth += block.width;
							}
						});

						const substring = findLargestSubstring(
							lastBlock.text,
							lastBlock.style,
							maxWidth,
							lastBlock === lastLine[0] ? textNode.marginLeft : lineWidth,
							word,
							style
						).secondPart;

						const newBlock = getTextBlock({
							text: substring,
							style,
							paddingTop: isFirstLineInNode ? textNode.paddingTop : 0,
							link: textNode.link,
						});

						lastLine.push(newBlock);
						isFirstLineInNode = false;

						lines.push([]);

						hasWrapped = true;
						blockNode.didBreakWords = true;

						words.unshift(word.slice(substring.length));

						// // If the last line is not empty, we must attempt to fit the word into a new empty line.
						// // Push a new line to the lines array.
						// lines.push([]);
						//
						// hasWrapped = true;
						//
						// // Insert the current word back at the start of the words array.
						// words.unshift(word);
					}
				} else {
					// If the current string is not empty, we can push it to the last line and create the next line.
					if (lastLine.length === 0 && hasWrapped) {
						currentString = currentString.trimStart();
					}
					const isFirstBlockInLine = lines[lines.length - 1].length === 0;

					// Create a text block from the current string.
					const newBlock = getTextBlock({
						text: currentString,
						style,
						paddingTop: isFirstLineInNode ? textNode.paddingTop : 0,
						marginLeft: isFirstBlockInLine ? textNode.marginLeft : 0,
						listMark: !hasWrapped && isFirstBlockInLine ? listMark : undefined,
						link: textNode.link,
					});

					// Push the new block to the last line.
					lastLine.push(newBlock);
					isFirstLineInNode = false;

					// Push a new empty line to the lines array.
					lines.push([]);

					hasWrapped = true;

					// Set the current string to an empty string.
					currentString = '';

					// Insert the current word back at the start of the words array.
					words.unshift(word);
				}
			}
		}

		// Push the last text block if it exists.
		if (currentString !== '') {
			const isFirstBlockInLine = lines[lines.length - 1].length === 0;
			const lastBlock = getTextBlock({
				text: currentString,
				style,
				paddingTop: isFirstLineInNode ? textNode.paddingTop : 0,
				marginLeft: isFirstBlockInLine ? textNode.marginLeft : 0,
				listMark: !hasWrapped && isFirstBlockInLine ? listMark : undefined,
				link: textNode.link,
			});
			lines[lines.length - 1].push(lastBlock);
		}

		// Push a new empty line to the lines array.
		lines.push([]);
	}

	if (lines[lines.length - 1].length === 0) {
		lines.pop();
	}

	lines[0];
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
			line.push(
				getTextBlock({
					text: ' ',
					style: previousStyle ?? defaultStyle,
				})
			);
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
		yOffset = lineBottom - leading / 2 - (highestBlock?.measure.descent || 0);

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
	marginLeft?: number;
	paddingTop?: number;
	listMark?: string;
	link?: string;
}

function getTextBlock({
	text,
	style,
	paddingTop = 0,
	marginLeft = 0,
	listMark,
	link,
}: {
	text: string;
	style: LeafStyle;
	paddingTop?: number;
	marginLeft?: number;
	listMark?: string;
	link?: string;
}): LayoutTextBlock {
	const measure = measureText(text, style, paddingTop, marginLeft);
	const textBlock = {
		text,
		style,
		width: measure.width,
		x: 0,
		y: 0,
		measure,
		fontSize: style.fontSize === "auto" ? 14 : style.fontSize,
		paddingTop,
		marginLeft,
		listMark,
		link,
	};
	return textBlock;
}

const measureCache: Record<string, Record<string, MeasuredRect>> = {};

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && isFinite(value);
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

function measureText(text: string, style, paddingTop = 0, marginLeft = 0): MeasuredRect {
	if (measureCache[style.font]) {
		if (measureCache[style.font][text]) {
			const rect = { ...measureCache[style.font][text] };
			rect.width += marginLeft;
			rect.height += paddingTop;
		}
	}
	conf.measureCtx.font = style.font;
	const measure = conf.measureCtx.measureText(text);
	const actualBoundingBoxAscent = toFiniteNumber(measure.actualBoundingBoxAscent);
	const actualBoundingBoxDescent = toFiniteNumber(measure.actualBoundingBoxDescent);
	const actualBoundingBoxLeft = toFiniteNumber(measure.actualBoundingBoxLeft);
	const actualBoundingBoxRight = toFiniteNumber(measure.actualBoundingBoxRight);
	const fontBoundingBoxAscent = toFiniteNumber(measure.fontBoundingBoxAscent);
	const fontBoundingBoxDescent = toFiniteNumber(measure.fontBoundingBoxDescent);
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
	const rectCopy = { ...rect };
	rectCopy.width += marginLeft;
	rectCopy.height += paddingTop;
	return rectCopy;
}

function splitTextIntoWords(text: string): string[] {
	// filter is important, do not remove
	return text.split(/(\s+)/).filter(element => element !== '');
}

function findLargestSubstring(
	firstStr: string,
	firstStyle: LeafStyle,
	maxWidth: number,
	marginLeft = 0,
	secondStr = '',
	secondStyle?: LeafStyle
): { firstPart: string; secondPart: string } {
	// Use binary search to find the largest substring of the word that fits within the maxWidth.
	let start = 0;
	const word = firstStr + secondStr;
	const firstStrLength = firstStr.length;
	let end = word.length;
	const largestSubstring: { firstPart: string; secondPart: string } = {
		firstPart: '',
		secondPart: '',
	};

	while (start <= end) {
		// Calculate the middle index of the current range
		const mid = Math.floor((start + end) / 2);

		if (mid === 0) {
			// If mid is 0, the range is 0 to 0, so break out of the loop
			largestSubstring.firstPart = word.slice(0, 1);
			break;
		}

		// Measure the width of the substring using the getTextBlock function
		let blocksWidth = 0;

		const substrings: { text: string; style: LeafStyle }[] = [];
		if (mid <= firstStrLength) {
			substrings.push({ text: word.slice(0, mid), style: firstStyle });
		} else {
			substrings.push({ text: firstStr, style: firstStyle });
			substrings.push({
				text: word.slice(firstStrLength, mid),
				style: secondStyle!,
			});
		}

		substrings.forEach((substring, index) => {
			blocksWidth += getTextBlock({
				text: substring.text,
				style: substring.style,
				marginLeft: index === 0 ? marginLeft : 0,
			}).width;
		});

		if (blocksWidth <= maxWidth) {
			// If the substring width is less than or equal to maxWidth, update largestSubstring
			if (mid <= firstStrLength) {
				largestSubstring.firstPart = word.slice(0, mid);
			} else {
				largestSubstring.firstPart = firstStr;
				largestSubstring.secondPart = word.slice(firstStrLength, mid);
			}

			// Search for a longer substring in the second half of the range
			start = mid + 1;
		} else {
			// If the substring width is greater than maxWidth, search for a shorter substring in the first half of the range
			end = mid - 1;
		}
	}

	return largestSubstring;
}

function setBlockNodesCoordinates(nodes: LayoutBlockNode[]): number {
	let yOffset = 0;
	let paddingsSum = 0;
	for (const node of nodes) {
		for (const line of node.lines) {
			for (const block of line) {
				if (node !== nodes[0] || node.type === 'ul_list' || node.type === 'ol_list') {
					yOffset += block.paddingTop || 0;
					paddingsSum += block.paddingTop || 0;
				}
				block.y += yOffset;
				block.x += block.marginLeft || 0;
			}
		}
		yOffset += node.height;
	}

	return paddingsSum;
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
			case 'left':
				break;
			case 'center':
				alignToCenter(node, alignnentWidth, scale);
				break;
			case 'right':
				alignToRight(node, alignnentWidth, scale);
				break;
		}
	}
}

function alignToCenter(node: LayoutBlockNode, maxWidth: number, scale: number): void {
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

function alignToRight(node: LayoutBlockNode, maxWidth: number, scale: number): void {
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

function renderBlockNodes(ctx: Ctx, nodes: LayoutBlockNode[], scale?: number): void {
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
	ctx.font = textBlock.style.font ?? 'Arial';
	fillHighlight(ctx, textBlock);
	underline(ctx, textBlock);
	cross(ctx, textBlock);
	fillText(ctx, textBlock);
}

function fillHighlight(ctx: Ctx, textBlock: LayoutTextBlock): void {
	if (!textBlock.style.backgroundColor || textBlock.text === '\u00A0') {
		// U+00a0 is empty, for not highlighting emptyLine
		return;
	}
	const measure = textBlock.measure;
	ctx.fillStyle = textBlock.style.backgroundColor;
	ctx.fillRect(textBlock.x, textBlock.y - measure.ascent, measure.width, measure.height);
}

function underline(ctx: Ctx, textBlock: LayoutTextBlock): void {
	if (
		!textBlock.link &&
		(textBlock.style.textDecorationLine !== 'underline' || textBlock.text === '\u00A0')
	) {
		return;
	}
	const x = textBlock.x;
	const y = textBlock.y;
	const style = textBlock.style;
	const measure = textBlock.measure;
	const width = measure.width - (textBlock.marginLeft || 0);
	const color = style.color;
	ctx.strokeStyle = color;
	ctx.lineWidth = textBlock.fontSize / 14;
	ctx.beginPath();
	ctx.moveTo(x, y + (2 * textBlock.fontSize) / 14); // 14 - default fontSize
	ctx.lineTo(x + width, y + (2 * textBlock.fontSize) / 14);
	ctx.stroke();
	ctx.strokeStyle = style.backgroundColor ?? 'black';
	ctx.lineWidth = 2;
	// ctx.strokeText(textBlock.text, x, y);
}

function cross(ctx: Ctx, textBlock: LayoutTextBlock): void {
	if (textBlock.style.crossed !== 'line-through' || textBlock.text === '\u00A0') {
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
	ctx.strokeStyle = style.backgroundColor ?? 'black';
	ctx.lineWidth = 2;
}

function fillText(ctx: Ctx, textBlock: LayoutTextBlock): void {
	const { text, style, x, y } = textBlock;
	ctx.fillStyle = style.color;
	ctx.fillText(text, x, y);
	if (textBlock.listMark) {
		ctx.fillText(textBlock.listMark, x - measureText(textBlock.listMark, style).width - 4, y);
	}
}
