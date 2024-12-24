import { FrameType } from "./Basic";

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
