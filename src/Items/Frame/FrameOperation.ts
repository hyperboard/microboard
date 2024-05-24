import { BorderStyle, BorderWidth } from "../Path";
import { FrameType } from "./Basic";
import { Board } from "Board/Board";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import { DefaultRichTextData } from "../RichText/RichTextData";

export class FrameData {
	readonly itemType = "Frame";
	constructor(
		readonly shapeType: FrameType = "Custom",
		public backgroundColor = "white",
		public backgroundOpacity = 1,
		public borderColor = "black",
		public borderOpacity = 1,
		public borderStyle: BorderStyle = "solid",
		public borderWidth: BorderWidth = 1,
		public transformation = new DefaultTransformationData(),
		public children: string[] = [],
		public text = new DefaultRichTextData([], "top", 600),
		public canChangeRatio = true,
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
	board?: Board;
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
