import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from "slate-history";
import { TextNode } from "./TextNode";
import { BlockNode } from "./BlockNode";

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor;

export type CustomText = TextNode;

export type CustomElement = BlockNode;

declare module "slate" {
	interface CustomTypes {
		Editor: CustomEditor;
		Element: CustomElement;
		Text: CustomText;
	}
}
