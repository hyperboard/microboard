import { BorderStyle, BorderWidth } from "../Path";
import { FrameType } from "./Basic";
import { TransformationData } from "../Transformation";
import { RichTextData } from "..";
import { Board } from "Board/Board";

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
		public transformation = new TransformationData(),
		public children: string[] = [],
		public text = new RichTextData(),
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
