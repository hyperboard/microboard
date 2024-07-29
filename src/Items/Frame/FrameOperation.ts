import { BorderStyle, BorderWidth } from "../Path";
import { FrameType } from "./Basic";
import { Board } from "Board/Board";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { FRAME_BORDER_COLOR, FRAME_FILL_COLOR } from "View/Items/Frame";
import { Mbr } from "../Mbr";

export class FrameData {
	readonly itemType = "Frame";
	constructor(
		readonly shapeType: FrameType = "Custom",
		public backgroundColor = FRAME_FILL_COLOR,
		public backgroundOpacity = 1,
		public borderColor = FRAME_BORDER_COLOR,
		public borderOpacity = 0,
		public borderStyle: BorderStyle = "solid",
		public borderWidth: BorderWidth = 1,
		public transformation = new DefaultTransformationData(),
		public children: string[] = [],
		public text = new DefaultRichTextData([], "top", 600),
		public canChangeRatio = true,
		public zIndex: number,
	) {}
}

interface SetBackgroundColor {
	class: "Frame";
	method: "setBackgroundColor";
	item: string[];
	backgroundColor: string;
}

interface SetCanChangeRatio {
	class: "Frame";
	method: "setCanChangeRatio";
	item: string[];
	canChangeRatio: boolean;
}

interface SetFrameType {
	class: "Frame";
	method: "setFrameType";
	item: string[];
	shapeType: FrameType;
	prevShapeType: FrameType;
	prevMbr: Record<"left" | "right" | "top" | "bottom", number>;
}

interface AddChild {
	class: "Frame";
	method: "addChild";
	item: string[];
	childId: string;
}

interface RemoveChild {
	class: "Frame";
	method: "removeChild";
	item: string[];
	childId: string;
}

export type FrameOperation =
	| SetBackgroundColor
	| SetCanChangeRatio
	| SetFrameType
	| AddChild
	| RemoveChild;
