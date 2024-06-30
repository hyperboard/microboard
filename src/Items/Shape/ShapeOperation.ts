import { BorderStyle } from "../Path";
import { ShapeType } from "./Basic";

export type ShapeOperation =
	| SetBackgroundColor
	| SetBackgroundOpacity
	| SetBorderColor
	| SetBorderOpacity
	| SetBorderStyle
	| SetBorderWidth
	| SetShapeType;

interface BaseShapeOperation {
	class: "Shape";
	item: string[];
}

interface SetBackgroundColor extends BaseShapeOperation {
	method: "setBackgroundColor";
	backgroundColor: string;
}

interface SetBackgroundOpacity extends BaseShapeOperation {
	method: "setBackgroundOpacity";
	backgroundOpacity: number;
}

interface SetBorderColor extends BaseShapeOperation {
	method: "setBorderColor";
	borderColor: string;
}

interface SetBorderOpacity extends BaseShapeOperation {
	method: "setBorderOpacity";
	borderOpacity: number;
}

interface SetBorderStyle extends BaseShapeOperation {
	method: "setBorderStyle";
	borderStyle: BorderStyle;
}

interface SetBorderWidth extends BaseShapeOperation {
	method: "setBorderWidth";
	borderWidth: number;
}

interface SetShapeType extends BaseShapeOperation {
	method: "setShapeType";
	shapeType: ShapeType;
}
