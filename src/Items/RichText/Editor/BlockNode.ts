import { HorisontalAlignment } from "../../Alignment";
import { LinkNode, TextNode } from "./TextNode";

export const ListTypes = ["ol_list", "ul_list"] as const;

export type ListType = (typeof ListTypes)[number];

export const BlockTypes = [
	"paragraph",
	"ul_list",
	"ol_list",
	"list_item",
	"code_block",
	"heading_one",
	"heading_two",
	"heading_three",
	"heading_four",
	"heading_five",
	"block-quote",
] as const;

export type BlockType = (typeof BlockTypes)[number];

export type ParagraphNode = {
	type: "paragraph";
	children: TextNode[] | LinkNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
	lineHeight?: number;
};

export type CodeBlockNode = {
	type: "code_block";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
	language: string | null;
};

export type HeadingOneNode = {
	type: "heading_one";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type HeadingTwoNode = {
	type: "heading_two";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type HeadingThreeNode = {
	type: "heading_three";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type HeadingFourNode = {
	type: "heading_four";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type HeadingFiveNode = {
	type: "heading_five";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type BlockQuoteNode = {
	type: "block-quote";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type BulletedListNode = {
	type: "ul_list";
	children: ListItemNode[];
	listLevel: number;
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type NumberedListNode = {
	type: "ol_list";
	children: ListItemNode[];
	listLevel: number;
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type HeadingNode =
	| HeadingOneNode
	| HeadingTwoNode
	| HeadingThreeNode
	| HeadingFourNode
	| HeadingFiveNode;

export type ListItemChild = NumberedListNode | BulletedListNode | TextNode;

export type ListItemNode = {
	type: "list_item";
	children: BlockNode[];
	horisontalAlignment?: HorisontalAlignment;
	paddingTop?: number;
	paddingBottom?: number;
};

export type BlockNode =
	| ParagraphNode
	| CodeBlockNode
	| HeadingOneNode
	| HeadingTwoNode
	| HeadingThreeNode
	| HeadingFourNode
	| HeadingFiveNode
	| BlockQuoteNode
	| BulletedListNode
	| NumberedListNode
	| ListItemNode;
