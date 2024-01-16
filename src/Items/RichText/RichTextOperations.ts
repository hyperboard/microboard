import { BaseSelection, Descendant, Operation } from "slate";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { TransformationData } from "../Transformation";
import { BlockType } from "./Editor/BlockNode";
import { TextStyle } from "./Editor/TextNode";

export class RichTextData {
	readonly itemType = "RichText";
	constructor(
		public children: Descendant[] = [],
		public verticalAlignment: VerticalAlignment = "center",
		public maxWidth: number | undefined,
		public transformation?: TransformationData,
		public containerMaxWidth?: number
	) {}
}

interface SetBlockType {
	class: "RichText";
	method: "setBlockType";
	item: string[];
	type: BlockType;
}

interface SetFontColor {
	class: "RichText";
	method: "setFontColor";
	item: string[];
	fontColor: string;
}

interface SetFontStyle {
	class: "RichText";
	method: "setFontStyle";
	item: string[];
	fontStyleList: TextStyle[];
}

interface SetFontFamily {
	class: "RichText";
	method: "setFontFamily";
	item: string[];
	fontFamily: string;
}

interface SetFontSize {
	class: "RichText";
	method: "setFontSize";
	item: string[];
	fontSize: number;
}

interface SetFontHighlight {
	class: "RichText";
	method: "setFontHighlight";
	item: string[];
	fontHighlight: string;
}

interface SetHorisontalAligment {
	class: "RichText";
	method: "setHorisontalAlignment";
	item: string[];
	horisontalAlignment: HorisontalAlignment;
}

interface SetVerticalAlignment {
	class: "RichText";
	method: "setVerticalAlignment";
	item: string[];
	verticalAlignment: VerticalAlignment;
}
interface SetMaxWidth {
	class: "RichText";
	method: "setMaxWidth";
	item: string[];
	maxWidth: number;
}

export type SelectionMethod =
	| "setSelectionHorisontalAlignment"
	| "setSelectionFontHighlight"
	| "setSelectionFontSize"
	| "setSelectionFontFamily"
	| "setSelectionFontStyle"
	| "setSelectionFontColor"
	| "setSelectionBlockType"
	| "edit";

export interface SelectionOp {
	class: "RichText";
	method: SelectionMethod;
	item: string[];
	selection: BaseSelection;
	ops: Operation[];
}

export type WholeTextOp =
	| SetBlockType
	| SetFontColor
	| SetFontStyle
	| SetFontFamily
	| SetFontSize
	| SetFontHighlight
	| SetHorisontalAligment
	| SetVerticalAlignment
	| SetMaxWidth;

export type WholeTextMethod = WholeTextOp["method"];

export type RichTextOperation = WholeTextOp | SelectionOp;
