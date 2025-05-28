import { TransformationData } from "./TransformationData";

interface TransformationBase {
	class: "Transformation";
	item: string[];
	timestamp?: number;
}

export interface TranslateOperation extends TransformationBase {
	method: "translateTo" | "translateBy";
	x: number;
	y: number;
	timeStamp?: number;
}

export interface ScaleOperation extends TransformationBase {
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

export interface ScaleByTranslateByOperation extends TransformationBase {
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

interface Locked extends TransformationBase {
	method: "locked";
	locked: boolean;
}

interface Unlocked extends TransformationBase {
	method: "unlocked";
	locked: boolean;
}

export interface TransformManyItems {
	[key: string]:
		| ScaleByTranslateByOperation
		| ScaleOperation
		| TranslateOperation;
}

export interface TransformMany {
	class: "Transformation";
	method: "transformMany";
	items: TransformManyItems;
	timeStamp?: number;
}

export type TransformationOperation =
	| TranslateOperation
	| ScaleOperation
	| RotateOperation
	| ScaleRelativeToOperation
	| ScaleByTranslateByOperation
	| DeserializeOperation
	| TransformMany
	| Locked
	| Unlocked;
