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
