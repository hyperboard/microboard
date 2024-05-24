import { TransformationData } from "./TransformationData";

interface TransformationBase {
	class: "Transformation";
	item: string[];
	timestamp?: number;
}

interface TranslateOperation extends TransformationBase {
	method: "translateTo" | "translateBy";
	x: number;
	y: number;
	timeStamp?: number;
}

interface ScaleOperation extends TransformationBase {
	method: "scaleTo" | "scaleBy";
	x: number;
	y: number;
	timeStamp?: number;
}

interface RotateOperation extends TransformationBase {
	method: "rotateTo" | "rotateBy";
	degree: number;
	timeStamp?: number;
}

interface ScaleRelativeToOperation extends TransformationBase {
	method: "scaleToRelativeTo" | "scaleByRelativeTo";
	x: number;
	y: number;
	point: { x: number; y: number };
	timeStamp?: number;
}

interface ScaleByTranslateByOperation extends TransformationBase {
	method: "scaleByTranslateBy";
	translate: { x: number; y: number };
	scale: { x: number; y: number };
	timeStamp?: number;
}

interface DeserializeOperation extends TransformationBase {
	method: "deserialize";
	data: TransformationData;
	timeStamp?: number;
}

export interface TransformMany {
	class: "Transformation";
	method: "transformMany";
	items: {
		[key: string]:
			| ScaleByTranslateByOperation
			| ScaleOperation
			| TranslateOperation;
	};
	timeStamp?: number;
}

export type TransformationOperation =
	| TranslateOperation
	| ScaleOperation
	| RotateOperation
	| ScaleRelativeToOperation
	| ScaleByTranslateByOperation
	| DeserializeOperation;
