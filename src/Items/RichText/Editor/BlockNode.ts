import { HorisontalAlignment } from "../../Alignment";
import { TextNode } from "./TextNode";

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
	"block-quote",
] as const;

export type BlockType = (typeof BlockTypes)[number];

export type ParagraphNode = {
	type: "paragraph";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	lineHeight?: number;
};

export type CodeBlockNode = {
	type: "code_block";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
	language: string | null;
};

export type HeadingOneNode = {
	type: "heading_one";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type HeadingTwoNode = {
	type: "heading_two";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type HeadingThreeNode = {
	type: "heading_three";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type BlockQuoteNode = {
	type: "block-quote";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type BulletedListNode = {
	type: "ul_list";
	children: ListItemNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type NumberedListNode = {
	type: "ol_list";
	children: ListItemNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type ListItemChild = NumberedListNode | BulletedListNode | TextNode;

export type ListItemNode = {
	type: "list_item";
	children: BlockNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type BlockNode =
	| ParagraphNode
	| CodeBlockNode
	| HeadingOneNode
	| HeadingTwoNode
	| HeadingThreeNode
	| BlockQuoteNode
	| BulletedListNode
	| NumberedListNode
	| ListItemNode;
