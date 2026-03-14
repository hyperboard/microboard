import { BorderStyle } from "../Path";
import { ColorValue } from "Color";

interface DrawingSetStrokeColorOp {
	class: "Drawing";
	method: "setStrokeColor";
	item: string[];
	color: ColorValue;
}
interface DrawingSetStrokeWidthOp {
	class: "Drawing";
	method: "setStrokeWidth";
	item: string[];
	width: number;
	prevWidth: number;
}
interface DrawingSetStrokeOpacityOp {
	class: "Drawing";
	method: "setStrokeOpacity";
	item: string[];
	opacity: number;
}
interface DrawingSetStrokeStyleOp {
	class: "Drawing";
	method: "setStrokeStyle";
	item: string[];
	style: BorderStyle;
}

export type DrawingOperation =
	| DrawingSetStrokeColorOp
	| DrawingSetStrokeWidthOp
	| DrawingSetStrokeOpacityOp
	| DrawingSetStrokeStyleOp;
