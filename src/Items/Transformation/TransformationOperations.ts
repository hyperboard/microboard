export class TransformationData {
	constructor(
		public translateX = 0,
		public translateY = 0,
		public scaleX = 1,
		public scaleY = 1,
		public rotate = 0,
	) {}
}

interface TranslateTo {
	class: "Transformation";
	method: "translateTo";
	item: string[];
	x: number;
	y: number;
}

export interface TranslateBy {
	class: "Transformation";
	method: "translateBy";
	item: string[];
	x: number;
	y: number;
}

interface ScaleTo {
	class: "Transformation";
	method: "scaleTo";
	item: string[];
	x: number;
	y: number;
}

export interface ScaleBy {
	class: "Transformation";
	method: "scaleBy";
	item: string[];
	x: number;
	y: number;
}

interface RotateTo {
	class: "Transformation";
	method: "rotateTo";
	item: string[];
	degree: number;
}

interface RotateBy {
	class: "Transformation";
	method: "rotateBy";
	item: string[];
	degree: number;
}

interface ScaleToRelativeTo {
	class: "Transformation";
	method: "scaleToRelativeTo";
	item: string[];
	x: number;
	y: number;
	point: { x: number; y: number };
}

interface ScaleByRelativeTo {
	class: "Transformation";
	method: "scaleByRelativeTo";
	item: string[];
	x: number;
	y: number;
	point: { x: number; y: number };
}

export interface ScaleByTranslateBy {
	class: "Transformation";
	method: "scaleByTranslateBy";
	item: string[];
	translate: { x: number; y: number };
	scale: { x: number; y: number };
}

interface Deserialize {
	class: "Transformation";
	method: "deserialize";
	item: string[];
	data: TransformationData;
}

export interface TransformMany {
	class: "Transformation";
	method: "transformMany";
	items: { [key: string]: ScaleByTranslateBy | ScaleBy | TranslateBy };
}

export type TransformationOperation =
	| TranslateTo
	| TranslateBy
	| ScaleBy
	| ScaleTo
	| RotateBy
	| RotateTo
	| ScaleByRelativeTo
	| ScaleToRelativeTo
	| ScaleByTranslateBy
	| Deserialize
	| TransformMany;
