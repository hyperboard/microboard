import { Mbr, Point } from "Board/Items";

export type ResizeType =
	| "left"
	| "top"
	| "right"
	| "bottom"
	| "leftTop"
	| "leftBottom"
	| "rightTop"
	| "rightBottom";

export function getResizeType(
	cursorPoint: Point,
	cameraScale: number,
	mbr?: Mbr,
	anchorDistance = 5,
): ResizeType | undefined {
	if (!mbr) {
		return undefined;
	}

	anchorDistance = anchorDistance / cameraScale;

	const { left, top, right, bottom } = mbr;

	if (new Point(right, top).getDistance(cursorPoint) < anchorDistance) {
		return "rightTop";
	}
	if (new Point(right, bottom).getDistance(cursorPoint) < anchorDistance) {
		return "rightBottom";
	}
	if (new Point(left, bottom).getDistance(cursorPoint) < anchorDistance) {
		return "leftBottom";
	}
	if (new Point(left, top).getDistance(cursorPoint) < anchorDistance) {
		return "leftTop";
	}

	const nearest = mbr.getNearestEdgePointTo(cursorPoint);

	if (nearest.getDistance(cursorPoint) >= anchorDistance) {
		return undefined;
	}
	if (nearest.y === top) {
		return "top";
	}
	if (nearest.x === right) {
		return "right";
	}
	if (nearest.y === bottom) {
		return "bottom";
	}
	if (nearest.x === left) {
		return "left";
	}

	return undefined;
}
