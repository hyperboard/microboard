import { BorderStyle } from "../Path";
import { ShapeType } from "./ShapeType";
import { ColorValue } from "Color";

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
	backgroundColor: ColorValue;
}

interface SetBackgroundOpacity extends BaseShapeOperation {
	method: "setBackgroundOpacity";
	backgroundOpacity: number;
}

interface SetBorderColor extends BaseShapeOperation {
	method: "setBorderColor";
	borderColor: ColorValue;
}

interface SetBorderOpacity extends BaseShapeOperation {
	method: "setBorderOpacity";
	borderOpacity: number;
}

interface SetBorderStyle extends BaseShapeOperation {
	method: "setBorderStyle";
	borderStyle: BorderStyle;
}

export interface SetBorderWidth extends BaseShapeOperation {
	method: "setBorderWidth";
	borderWidth: number;
	prevBorderWidth: number;
}

interface SetShapeType extends BaseShapeOperation {
	method: "setShapeType";
	shapeType: ShapeType;
}
