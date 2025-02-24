import { BaseEditor, Editor } from "slate";
import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { DEFAULT_TEXT_STYLES } from "View/Items/RichText";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from "slate-history";
import { LinkNode, TextNode } from "Board/Items/RichText/Editor/TextNode";
import { HorisontalAlignment } from "Board/Items/Alignment";
import {
	convertLinkNodeToTextNode,
	validateLinkOrTextNode,
} from "Board/Items/RichText/CanvasText/convertLinkNodeToTextNode";

export function setNodeChildrenStyles({
	editor,
	horisontalAlignment,
	node,
}: {
	editor?: BaseEditor & ReactEditor & HistoryEditor;
	horisontalAlignment?: HorisontalAlignment;
	node: BlockNode;
}) {
	let fontStyles = DEFAULT_TEXT_STYLES;
	if (editor) {
		fontStyles = Editor.marks(editor) || DEFAULT_TEXT_STYLES;
	}

	switch (node.type) {
		case "heading_one":
			fontStyles = { ...fontStyles, bold: true, fontSize: 18 };
			break;
		case "heading_two":
			fontStyles = { ...fontStyles, bold: true, fontSize: 17 };
			break;
		case "heading_three":
			fontStyles = { ...fontStyles, bold: true, fontSize: 16 };
			break;
		case "heading_four":
			fontStyles = { ...fontStyles, bold: true, fontSize: 15 };
			break;
		case "heading_five":
			fontStyles = { ...fontStyles, bold: true, fontSize: 14 };
			break;
	}

	function isSymbol(str: string) {
		const symbolRegex = /^[^\w\s]$/;

		return symbolRegex.test(str);
	}

	node.children = node.children
		.map((children: TextNode | LinkNode) => {
			return validateLinkOrTextNode(children);
		})
		.map((children, index) => {
			const nextChildren: TextNode | LinkNode = node.children[index + 1];
			let nextChildrenText = "";
			if (nextChildren) {
				if (nextChildren.type === "link") {
					nextChildrenText = nextChildren.children[0].text;
				} else {
					nextChildrenText = nextChildren.text;
				}
			}

			let currentText = "";
			if (children.type === "link") {
				currentText = children.children
					?.map(textNode => textNode.text)
					.join();
			} else {
				currentText = children.text;
			}

			const isNoSpaceBetweenNextTextAndCurrent =
				currentText &&
				nextChildren &&
				nextChildrenText &&
				currentText &&
				currentText[currentText.length - 1] !== " " &&
				!nextChildrenText.startsWith(" ") &&
				!isSymbol(nextChildrenText[0]);

			if (isNoSpaceBetweenNextTextAndCurrent) {
				if (children.type === "text") {
					children.text += " ";
				}
			}

			if (children.type === "text") {
				return {
					...fontStyles,
					...children,
				};
			}
			return {
				...children,
				children: children.children?.map(child => ({
					...fontStyles,
					...child,
					fontColor: "rgb(71, 120, 245)",
				})),
			};
		});
	node.horisontalAlignment = horisontalAlignment || "left";
}

export function setNodeStyles({
	node,
	isPaddingTopNeeded,
	editor,
	horisontalAlignment,
}: {
	node: BlockNode;
	isPaddingTopNeeded: boolean;
	editor?: BaseEditor & ReactEditor & HistoryEditor;
	horisontalAlignment?: HorisontalAlignment;
}) {
	if (node.type === "ol_list" || node.type === "ul_list") {
		for (const listItem of node.children) {
			for (const listItemChild of listItem.children) {
				setNodeStyles({
					node: listItemChild,
					editor,
					horisontalAlignment,
					isPaddingTopNeeded: true,
				});
			}
		}
	} else {
		if (isPaddingTopNeeded) {
			node.paddingTop = 0.5;
		}
		setNodeChildrenStyles({ node, editor, horisontalAlignment });
	}
}
