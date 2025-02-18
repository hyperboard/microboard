import { HorisontalAlignment } from "../Alignment";
import { BlockNode } from "./Editor/BlockNode";
import { TextStyle } from "./Editor/TextNode";

export function getParagraph(
	fontStyles: TextStyle[],
	fontColor: string,
	fontSize: number,
	fontFamily: string,
	defaultHorizontalAlignment: HorisontalAlignment,
	text: string,
): BlockNode[] {
	return [
		{
			type: "paragraph",
			lineHeight: 1.4,
			children: [
				{
					type: "text",
					bold: fontStyles.includes("bold"),
					italic: fontStyles.includes("italic"),
					underline: fontStyles.includes("underline"),
					"line-through": fontStyles.includes("line-through"),
					fontColor: fontColor,
					fontHighlight: "",
					fontSize: fontSize,
					fontFamily: fontFamily,
					horisontalAlignment: defaultHorizontalAlignment,
					text,
					overline: false,
					subscript: false,
					superscript: false,
				},
			],
		},
	];
}
