import {
	DefaultTransformationData,
	TransformationData,
} from "../Transformation/TransformationData";
import { RichTextData } from "../RichText";
import { BorderStyle, BorderWidth } from "../Path";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { FrameType } from "./Basic";
import { SETTINGS } from "Board/Settings";
const { i18n } = SETTINGS;

export const FRAME_BORDER_COLOR = "rgba(10, 15, 41, 0.08)";

export const FRAME_HIGHLIGHTER_BORDER_COLOR = "#93AFF6";
export const FRAME_CHILDREN_HIGHLIGHTER_COLOR = "rgb(10, 15, 41, .08)";
export const FRAME_CHILDREN_HIGHLIGHTER_BORDER_COLOR = "#4778F5";

export const FRAME_TITLE_COLOR = "rgb(107, 110, 120)";
export const FRAME_TYPES = [
	// { id: "Custom", label: i18n.t("frame.custom") },
	{ id: "Custom", label: "Custom" },
	{ id: "Frame16x9", label: "16:9" },
	{ id: "Frame3x2", label: "3:2" },
	{ id: "Frame4x3", label: "4:3" },
	{ id: "A4", label: "A4" },
	{ id: "Letter", label: "Letter" },
	{ id: "Frame9x18", label: "9:18" },
	{ id: "Frame1x1", label: "1:1" },
] as const;

export const FRAME_FILL_COLORS = [
	"rgb(255, 255, 255)",
	"rgb(254, 244, 69)",
	"rgb(255, 177, 60)",
	"rgb(230, 72, 61)",
	"rgb(204, 208, 213)",
	"rgb(204, 241, 0)",
	"rgb(140, 236, 0)",
	"rgb(218, 0, 99)",
	"rgb(113, 118, 132)",
	"rgb(18, 205, 212)",
	"rgb(0, 158, 41)",
	"rgb(149, 16, 172)",
	"rgb(20, 21, 26)",
	"rgb(71, 120, 245)",
	"rgb(29, 84, 226)",
	"rgb(115, 29, 226)",
];

export const FRAME_FILL_COLOR = FRAME_FILL_COLORS[0];

export interface FrameData {
	readonly itemType: "Frame";
	shapeType: FrameType;
	backgroundColor: string;
	backgroundOpacity: number;
	borderColor: string;
	borderOpacity: number;
	borderStyle: BorderStyle;
	borderWidth: BorderWidth;
	children: string[];
	transformation?: TransformationData;
	text?: RichTextData;
	canChangeRatio?: boolean;
	linkTo?: string;
}

export class DefaultFrameData implements FrameData {
	readonly itemType = "Frame";
	constructor(
		public shapeType: FrameType = "Custom",
		public backgroundColor = FRAME_FILL_COLOR,
		public backgroundOpacity = 1,
		public borderColor = FRAME_BORDER_COLOR,
		public borderOpacity = 0.08,
		public borderStyle: BorderStyle = "solid",
		public borderWidth: BorderWidth = 0.2,
		public transformation = new DefaultTransformationData(),
		public children: string[] = [],
		public text: RichTextData = new DefaultRichTextData([], "top", 600),
		public canChangeRatio = true,
		public linkTo?: string,
	) {}
}
