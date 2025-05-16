import { BaseEditor, Editor } from "slate";
import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from "slate-history";
import { LinkNode, TextNode } from "Board/Items/RichText/Editor/TextNode";
import { HorisontalAlignment } from "Board/Items/Alignment";
import { convertLinkNodeToTextNode } from "Board/Items/RichText/CanvasText/convertLinkNodeToTextNode";

import { conf } from "Board/Settings";

export function setNodeChildrenStyles({
	editor,
	horisontalAlignment,
	node,
}: {
	editor?: BaseEditor & ReactEditor & HistoryEditor;
	horisontalAlignment?: HorisontalAlignment;
	node: BlockNode;
}): void {
	let fontStyles = conf.DEFAULT_TEXT_STYLES;
	if (editor) {
		fontStyles = Editor.marks(editor) || conf.DEFAULT_TEXT_STYLES;
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
			return convertLinkNodeToTextNode(children);
		})
		.map((children: TextNode, index) => {
			const nextChildren: TextNode = node.children[index + 1];

			const isNoSpaceBetweenNextTextAndCurrent =
				nextChildren &&
				nextChildren.text &&
				children.text &&
				children.text[children.text.length - 1] !== " " &&
				!nextChildren.text.startsWith(" ") &&
				!isSymbol(nextChildren.text[0]);

			if (isNoSpaceBetweenNextTextAndCurrent) {
				children.text += " ";
			}

			let fontColor = fontStyles.fontColor;
			if (
				fontColor === conf.DEFAULT_TEXT_STYLES.fontColor &&
				children.link
			) {
				fontColor = "rgba(71, 120, 245, 1)";
			}

			return {
				...fontStyles,
				...children,
				fontColor,
			};
		});
	node.horisontalAlignment = horisontalAlignment || "left";
}

export function setNodeStyles({
	node,
	isPaddingTopNeeded,
	listLevel = 1,
	editor,
	horisontalAlignment,
}: {
	node: BlockNode;
	isPaddingTopNeeded: boolean;
	listLevel?: number;
	editor?: BaseEditor & ReactEditor & HistoryEditor;
	horisontalAlignment?: HorisontalAlignment;
}) {
	if (node.type === "ol_list" || node.type === "ul_list") {
		node.listLevel = listLevel;
		for (const listItem of node.children) {
			for (const listItemChild of listItem.children) {
				setNodeStyles({
					node: listItemChild,
					editor,
					listLevel: listLevel + 1,
					horisontalAlignment,
					isPaddingTopNeeded: listItemChild === listItem.children[0],
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
