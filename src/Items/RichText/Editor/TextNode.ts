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

export type TextStyle = (typeof TextStyles)[number];

export type TextNode = {
	type: "text";
	text: string;
	link?: string;
	styles?: TextStyle[];
	bold: boolean;
	italic: boolean;
	underline: boolean;
	overline: boolean;
	"line-through": boolean;
	subscript: boolean;
	superscript: boolean;
	fontFamily?: string;
	fontColor?: string;
	fontSize?: number | "auto";
	fontHighlight?: string;
	enableAuto?: boolean;
	paddingTop?: number;
	paddingBottom?: number;
	horisontalAlignment?: HorisontalAlignment;
};

export type LinkNode = {
	type: "link";
	link: string;
	children: TextNode[];
	paddingTop?: number;
	paddingBottom?: number;
};
