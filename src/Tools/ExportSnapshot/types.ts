export enum Quality {
	HIGH,
	MEDIUM,
	STANDARD,
	LOW,
}

export const Resolution = {
	[Quality.HIGH]: 4,
	[Quality.MEDIUM]: 3,
	[Quality.STANDARD]: 2,
	[Quality.LOW]: 1,
};

export interface SnapshotSelection {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}

export type ExportFrameDecorationDirection = `${"top" | "bottom"}-${
	| "left"
	| "right"}`;

export type ExportFrameDecoration = {
	path: Path2D;
	color: string;
	width: number;
	height: number;
	lineWidth: number;
	offsetX?: number;
	offsetY?: number;
};

export type ExportFrameDecorationRecord = Record<
	ExportFrameDecorationDirection,
	ExportFrameDecoration
>;
