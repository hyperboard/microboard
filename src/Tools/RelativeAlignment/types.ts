export interface Camera {
	scale: number;
	translationX: number;
	translationY: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface MBR {
	left: number;
	top: number;
	right: number;
	bottom: number;
	centerX?: number;
	centerY?: number;
}

export interface Item {
	getMbr: () => MBR;
}

export interface Pointer {
	point: Point;
	item: Item;
}

export interface Line {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}
