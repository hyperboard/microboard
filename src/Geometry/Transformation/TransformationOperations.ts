import { TransformationData } from "./TransformationData";

interface TransformationBase {
	class: "Transformation";
	item: string[];
	timestamp?: number;
	silent?: boolean;
}

/** @deprecated Use ApplyMatrixOperation instead. Kept for reading legacy events. */
export interface TranslateOperation extends TransformationBase {
	method: "translateTo" | "translateBy";
	x: number;
	y: number;
	timeStamp?: number;
}

/** @deprecated Use ApplyMatrixOperation instead. Kept for reading legacy events. */
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

/** @deprecated Use ApplyMatrixOperation instead. Kept for reading legacy events. */
interface ScaleRelativeToOperation extends TransformationBase {
	method: "scaleToRelativeTo" | "scaleByRelativeTo";
	x: number;
	y: number;
	point: { x: number; y: number };
	timeStamp?: number;
}

/** @deprecated Use ApplyMatrixOperation instead. Kept for reading legacy events. */
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
	timeStamp?: number;
}

interface Unlocked extends TransformationBase {
	method: "unlocked";
	locked: boolean;
	timeStamp?: number;
}

export interface MatrixData {
	translateX: number;
	translateY: number;
	scaleX: number;
	scaleY: number;
	shearX: number;
	shearY: number;
}

export interface ApplyMatrixItem {
	id: string;
	matrix: MatrixData;
}

/** @deprecated Use MoveOperation or SetPlacementOperation instead */
export interface ApplyMatrixOperation {
	class: "Transformation";
	method: "applyMatrix";
	items: ApplyMatrixItem[];
	timeStamp?: number;
	silent?: boolean;
}

export interface MoveItem {
	id: string;
	worldMatrix: MatrixData;
	prevWorldMatrix: MatrixData;
}

export interface MoveOperation {
	class: "Transformation";
	method: "move";
	items: MoveItem[];
	timeStamp?: number;
}

export interface SetPlacementItem {
	id: string;
	parentId: string;
	zOrderIndex: number;
	worldMatrix: MatrixData;
	prevParentId: string;
	prevWorldMatrix: MatrixData;
}

export interface SetPlacementOperation {
	class: "Transformation";
	method: "setPlacement";
	items: SetPlacementItem[];
	timeStamp?: number;
}

export interface TransformManyItems {
	[key: string]:
		| ApplyMatrixOperation
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
	| ApplyMatrixOperation
	| MoveOperation
	| SetPlacementOperation
	| RotateOperation
	| DeserializeOperation
	| TransformMany
	| Locked
	| Unlocked
	| TranslateOperation
	| ScaleOperation
	| ScaleByTranslateByOperation;
