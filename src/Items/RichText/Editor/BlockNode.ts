import { HorisontalAlignment } from "../../Alignment";
import { TextNode } from "./TextNode";

export const ListTypes = ["numbered-list", "bulleted-list"] as const;

export type ListType = typeof ListTypes[number];

export const BlockTypes = [
	"paragraph",
	"bulleted-list",
	"numbered-list",
	"list-item",
	"block-quote",
	"heading",
] as const;

export type BlockType = typeof BlockTypes[number];

export type ParagraphNode = {
	type: "paragraph";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type HeadingNode = {
	type: "heading";
	level: number;
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type BlockQuoteNode = {
	type: "block-quote";
	children: TextNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type BulletedListNode = {
	type: "bulleted-list";
	children: ListItemNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type NumberedListNode = {
	type: "numbered-list";
	children: ListItemNode[];
	horisontalAlignment?: HorisontalAlignment;
};

export type ListItemChild = NumberedListNode | BulletedListNode | TextNode;

export type ListItemNode = {
	type: "list-item";
	children: ListItemChild[];
	horisontalAlignment?: HorisontalAlignment;
};

export type BlockNode =
	| ParagraphNode
	| HeadingNode
	| BlockQuoteNode
	| BulletedListNode
	| NumberedListNode
	| ListItemNode;
