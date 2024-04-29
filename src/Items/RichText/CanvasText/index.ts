export function getBlockNodes(data, maxWidth) {
	if (!maxWidth) {
		maxWidth = Infinity;
	}
	const nodes = [];
	for (const node of data) {
		nodes.push(getBlockNode(node, maxWidth));
	}
	setBlockNodesCoordinates(nodes);
	let width = 0;
	let height = 0;
	for (const node of nodes) {
		width = Math.max(width, node.width);
		height += node.height;
	}
	align(nodes, maxWidth);
	return {
		nodes,
		maxWidth,
		width,
		height,
		render: ctx => {
			renderBlockNodes(ctx, nodes);
		},
	};
}

const getNode = {
	paragraph: getBlockNode,
	heading: getBlockNode,
	"block-quote": getBlockNode,
	"bulleted-list": getBlockNode,
	"numbered-list": getBlockNode,
	"list-item": getBlockNode,
	text: getTextNode,
};

function getBlockNode(data, maxWidth) {
	const node = {
		type: data.type,
		lineHeight: data.lineHeight ?? 1.4,
		children: [],
		lines: [],
		align: data.horisontalAlignment,
	};
	for (const child of data.children) {
		node.children.push(getNode[child.type](child));
	}
	layoutBlockNode(node, maxWidth);

	return node;
}

function getTextNode(data) {
	const text = data.text.length === 0 ? "\u00A0" : data.text;
	const node = {
		type: "text",
		text,
		style: getTextStyle(data),
		blocks: [],
	};
	return node;
}

function getTextStyle(data) {
	const leafStyle = {
		fontStyle: "normal",
		fontWeight: "normal",
		color: data.fontColor ?? "black",
		backgroundColor: data.fontHighlight,
		fontSize: data.fontSize ?? 14,
		fontFamily: data.fontFamily ?? "Arial",
	};

	const styles = data.styles ? data.styles : [];

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

const defaultStyle = getTextStyle({});

function getFont(style) {
	const fontStyle = style.fontStyle || "normal";
	const fontWeight = style.fontWeight || 400;
	const fontSize = style.fontSize || "14";
	const fontFamily = style.fontFamily || "Arial";
	const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
	return font;
}

function layoutBlockNode(blockNode, maxWidth) {
	const lines = [];
	for (const child of blockNode.children) {
		layoutTextNode(lines, child, maxWidth);
	}
	blockNode.lines = lines;
	fillEmptyLines(blockNode);
	setBlockNodeCoordinates(blockNode, 0, 0);
}

function layoutTextNode(lines, textNode, maxWidth) {
	// Check if textNode.text is empty. If it is, return since there is no text to process.
	if (textNode.text === "") {
		log("Text is empty. Exiting...");
		return;
	}

	// Check if the lines array is empty. If it is, add a new line to it.
	if (lines.length === 0) {
		lines.push([]);
		log("Empty lines array. Adding a new line...");
	}

	const style = textNode.style;
	const nodeLines = textNode.text.split("\n");

	for (let nodeLine of nodeLines) {
		nodeLine = nodeLine.replaceAll("\t", "        ");

		// Create an array of words by using the splitWords function on the textNode.text.
		const words = splitTextIntoWords(nodeLine);
		log("Words:", words);

		// Create a variable to hold the current text string.
		let currentString = "";

		// Shift words from the words array and process each word.
		let count = 0;
		let hasWrapped = false;
		while (words.length > 0) {
			count++;
			const word = words.shift();
			const newText =
				currentString === "" ? word : currentString + "" + word;
			log("Count:", count);
			log("Words:", words);
			log("Processing word:", word);
			log("Current text string:", newText);

			// Create a text block using the getTextBlock function with the current string.
			// The function will measure the text and set the text block width.
			const block = getTextBlock(newText, style);
			log("Created text block:", block);

			// Get the last line in the lines array and its width.
			const lastLine = lines[lines.length - 1];
			let lastLineWidth = 0;
			for (const block of lastLine) {
				lastLineWidth += block.width;
			}
			log("Last line:", lastLine);
			log("Last line width:", lastLineWidth);

			// Check if the newly created block's width, together with the width of the last line,
			// fits within the maxWidth.
			if (lastLineWidth + block.width <= maxWidth) {
				log(
					"Text block fits within maxWidth. Updating current text string.",
				);
				log("Current text string:", newText);
				currentString = newText;
			} else {
				log(
					"Text block does not fit within maxWidth. Processing current text string.",
				);
				if (currentString === "") {
					log("Current text string is empty.");
					// If the current string is empty, it means a single word does not fit the remaining width.
					if (lastLine.length === 0) {
						log("Last line is empty.");
						// If the last line is empty, a single word does not fit maxWidth and must be broken down.
						// Find the largest substring of the word that fits within the maxWidth.
						const substring = findLargestSubstring(
							word,
							style,
							maxWidth,
						);
						const remainingPart = word.slice(substring.length);
						log("Largest substring:", substring);
						log("Remaining part:", remainingPart);

						// Create a new block with the substring.
						const newBlock = getTextBlock(substring, style);
						log("New block:", newBlock);

						// Push the new block to the line.
						lastLine.push(newBlock);
						log("Updated last line:", lastLine);

						// Push a new line to the lines array.
						lines.push([]);
						log("Added a new line to lines array.");

						hasWrapped = true;

						// Insert the remaining part of the word at the start of the words array.
						words.unshift(remainingPart);
						log(
							"Inserted remaining part of the word at the start of the words array.",
						);
					} else {
						log("Last line is not empty.");
						// If the last line is not empty, we must attempt to fit the word into a new empty line.
						// Push a new line to the lines array.
						lines.push([]);
						log("Added a new line to lines array.");

						hasWrapped = true;

						// Insert the current word back at the start of the words array.
						words.unshift(word);
						log(
							"Inserted current word at the start of the words array.",
						);
					}
				} else {
					log("Current text string is not empty.");
					// If the current string is not empty, we can push it to the last line and create the next line.
					if (lastLine.length === 0 && hasWrapped) {
						log("Last line is empty.");
						currentString = currentString.trimStart();
					}

					// Create a text block from the current string.
					const newBlock = getTextBlock(currentString, style);
					log("New block:", newBlock);

					// Push the new block to the last line.
					lastLine.push(newBlock);
					log("Updated last line:", lastLine);

					// Push a new empty line to the lines array.
					lines.push([]);
					log("Added a new line to lines array.");

					hasWrapped = true;

					// Set the current string to an empty string.
					currentString = "";
					log("Reset current text string to an empty string.");

					// Insert the current word back at the start of the words array.
					words.unshift(word);
					log(
						"Inserted current word at the start of the words array.",
					);
				}
			}
		}

		// Push the last text block if it exists.
		if (currentString !== "") {
			const lastBlock = getTextBlock(currentString, style);
			lines[lines.length - 1].push(lastBlock);
			log("Pushed the last text block to the lines array.");
		}

		// Push a new empty line to the lines array.
		lines.push([]);
	}

	if (lines[lines.length - 1].length === 0) {
		lines.pop();
	}
}

function fillEmptyLines(blockNode) {
	for (let i = 0; i < blockNode.lines.length; i++) {
		const line = blockNode.lines[i];
		if (line.length === 0) {
			const previousLine = blockNode.lines[i - 1];
			let previousStyle = defaultStyle;
			if (previousLine !== undefined) {
				previousStyle = previousLine[previousLine.length - 1].style;
			}
			line.push(getTextBlock(" ", previousStyle ?? defaultStyle, 0, 0));
		}
	}
}

function setBlockNodeCoordinates(blockNode, x, y) {
	const lines = blockNode.lines;
	const lineHeight = blockNode.lineHeight;
	// Update x and y coordinates of text blocks.
	let yOffset = 0;
	let lineBottom = 0;
	let lineTop = 0;

	let maxWidth = 0;
	let totalHeight = 0;

	for (const line of lines) {
		let maxFontSize = 0;
		let highestBlock;
		let xOffset = 0;
		let leading = 0;
		const lineBoxHeight = 0;

		if (line.length === 0) {
			continue;
		}

		for (const block of line) {
			block.x = xOffset;

			// log("Updated coordinates of text block:", block);

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

		lineTop = lineBottom;
		lineBottom += maxFontSize * lineHeight;
		leading = maxFontSize * lineHeight - maxFontSize;
		yOffset = lineBottom - leading / 2 - highestBlock.measure.descent;

		for (const block of line) {
			block.y = yOffset;
		}

		// log("Incremented yOffset to move to the next line:", yOffset);
	}

	blockNode.width = maxWidth;
	blockNode.height = totalHeight;
}

function getTextBlock(text, style, x, y) {
	const measure = measureText(text, style);
	const textBlock = {
		text,
		style,
		width: measure.width,
		x,
		y,
		measure,
		fontSize: parseFloat(style.fontSize),
	};
	return textBlock;
}

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");
const measureCache = {};

function isFiniteNumber(value) {
	return typeof value === "number" && isFinite(value);
}

function toFiniteNumber(value, coerce = 0) {
	return isFiniteNumber(value) ? value : coerce;
}

function measureText(text, style) {
	// log("measureText: ", text, style);
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

function splitTextIntoWords(text) {
	return text.split(/(\s+)/);
}

function findLargestSubstring(word, style, maxWidth) {
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

function setBlockNodesCoordinates(nodes) {
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

function align(nodes, maxWidth) {
	const maxNodeWidth = nodes.reduce((acc, node) => {
		if (node.width > acc) {
			return node.width;
		}
		return acc;
	}, -1);
	for (const node of nodes) {
		switch (node.align) {
			case "left":
				break;
			case "center":
				alignToCenter(
					node,
					maxWidth === Infinity ? maxNodeWidth : maxWidth,
				);
				break;
			case "right":
				alignToRight(
					node,
					maxWidth === Infinity ? maxNodeWidth : maxWidth,
				);
				break;
		}
	}
}

function alignToCenter(node, maxWidth) {
	const nodeWidth = node.width;
	for (const line of node.lines) {
		let lineWidth = 0;
		for (const block of line) {
			lineWidth += block.width;
		}
		const xOffset = (maxWidth - lineWidth) / 2;
		if (maxWidth === Infinity) {
		}
		for (const block of line) {
			block.x += xOffset;
		}
	}
}

function alignToRight(node, maxWidth) {
	const nodeWidth = node.width;
	for (const line of node.lines) {
		let lineWidth = 0;
		for (const block of line) {
			lineWidth += block.width;
		}
		const xOffset = maxWidth - lineWidth;
		if (maxWidth === Infinity) {
		}
		for (const block of line) {
			block.x += xOffset;
		}
	}
}

function renderBlockNodes(ctx, nodes) {
	for (const node of nodes) {
		renderTextLines(ctx, node.lines);
	}
}

function renderTextLines(ctx, lines) {
	for (const line of lines) {
		for (const textBlock of line) {
			renderTextBlock(ctx, textBlock);
		}
	}
}

function renderTextBlock(ctx, textBlock) {
	ctx.font = textBlock.style.font;
	fillHighlight(ctx, textBlock);
	underline(ctx, textBlock);
	cross(ctx, textBlock);
	fillText(ctx, textBlock);
}

function fillHighlight(ctx, textBlock) {
	if (!textBlock.style.backgroundColor) {
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
	// log("fillHighlight: ", textBlock.x, textBlock.y, measure);
}

function underline(ctx, textBlock) {
	if (textBlock.style.textDecorationLine !== "underline") {
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
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y + 2);
	ctx.lineTo(x + width, y + 2);
	ctx.stroke();
	ctx.strokeStyle = style.backgroundColor;
	ctx.lineWidth = 2;
	// ctx.strokeText(textBlock.text, x, y);
	// log("underline: ", x, y, width, height);
}

function cross(ctx, textBlock) {
	if (textBlock.style.crossed !== "line-through") {
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
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y - textBlock.fontSize / 2 + 2);
	ctx.lineTo(x + width, y - textBlock.fontSize / 2 + 2);
	ctx.stroke();
	ctx.strokeStyle = style.backgroundColor;
	ctx.lineWidth = 2;
}

function fillText(ctx, textBlock) {
	const { text, style, x, y, measure } = textBlock;
	ctx.fillStyle = style.color;
	ctx.fillText(text, x, y);
	// log("fillText: ", text, x, y);
}

function log() {
	// console.log(...arguments);
}
