import { HorisontalAlignment } from "../../Alignment";

export const TextStyles = [
	"bold",
	"italic",
	"oblique",
	"underline",
	"overline",
	"line-through",
	"subscript",
	"superscript",
];

export type TextStyle = typeof TextStyles[number];

export type TextNode = {
	type: "text";
	text: string;
	// styles?: TextStyle[];
	bold: boolean;
	italic: boolean;
	underline: boolean;
	overline: boolean;
	lineThrough: boolean;
	subscript: boolean;
	superscript: boolean;
	fontFamily?: string;
	fontColor?: string;
	fontSize?: number;
	fontHighlight?: string;
	horisontalAlignment?: HorisontalAlignment;
};
