import { BorderStyle, BorderWidth } from "../Path";
import { RichTextData } from "../RichText";
import { TransformationData } from "../Transformation";
import { ShapeType } from "./Basic";

export class ShapeData {
	readonly itemType = "Shape";
	constructor(
		public shapeType: ShapeType = "Rectangle",
		public backgroundColor = "",
		public backgroundOpacity = 1,
		public borderColor = "black",
		public borderOpacity = 1,
		public borderStyle: BorderStyle = "solid",
		public borderWidth: BorderWidth = 1,
		public transformation = new TransformationData(),
		public text = new RichTextData(),
	) {}
}

interface SetBackgroundColor {
	class: "Shape";
	method: "setBackgroundColor";
	item: string[];
	backgroundColor: string;
}

interface SetBackgroundOpacity {
	class: "Shape";
	method: "setBackgroundOpacity";
	item: string[];
	backgroundOpacity: number;
}

interface SetBorderColor {
	class: "Shape";
	method: "setBorderColor";
	item: string[];
	borderColor: string;
}

interface SetBorderOpacity {
	class: "Shape";
	method: "setBorderOpacity";
	item: string[];
	borderOpacity: number;
}

interface SetBorderStyle {
	class: "Shape";
	method: "setBorderStyle";
	item: string[];
	borderStyle: BorderStyle;
}

interface SetBorderWidth {
	class: "Shape";
	method: "setBorderWidth";
	item: string[];
	borderWidth: number;
}

interface SetShapeType {
	class: "Shape";
	method: "setShapeType";
	item: string[];
	shapeType: ShapeType;
}

export type ShapeOperation =
	| SetBackgroundColor
	| SetBackgroundOpacity
	| SetBorderColor
	| SetBorderOpacity
	| SetBorderStyle
	| SetBorderWidth
	| SetShapeType;
