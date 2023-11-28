import { Mbr, Point } from "Board/Items";
import { ResizeType } from "./getResizeType";

export function getResizedMbr(
	resizeType: ResizeType,
	pointer: Point,
	mbr: Mbr,
	opposite: Point,
): Mbr {
	const { left, top, right, bottom } = mbr;
	const { x, y } = pointer;
	switch (resizeType) {
		case "leftTop": {
			if (x < opposite.x && y < opposite.y) {
				return new Mbr(x, y, opposite.x, opposite.y);
			} else if (x > opposite.x && y > opposite.y) {
				return new Mbr(opposite.x, opposite.y, x, y);
			} else if (x > opposite.x) {
				return new Mbr(opposite.x, y, x, opposite.y);
			} else {
				return new Mbr(x, opposite.y, opposite.x, y);
			}
		}
		case "rightBottom": {
			if (x > opposite.x && y > opposite.y) {
				return new Mbr(opposite.x, opposite.y, x, y);
			} else if (x < opposite.x && y < opposite.y) {
				return new Mbr(x, y, opposite.x, opposite.y);
			} else if (x < opposite.x) {
				return new Mbr(x, opposite.y, opposite.x, y);
			} else {
				return new Mbr(opposite.x, y, x, opposite.y);
			}
		}
		case "rightTop": {
			if (x > opposite.x && y < opposite.y) {
				return new Mbr(opposite.x, y, x, opposite.y);
			} else if (x < opposite.x && y > opposite.y) {
				return new Mbr(x, opposite.y, opposite.x, y);
			} else if (x < opposite.x) {
				return new Mbr(x, y, opposite.x, opposite.y);
			} else {
				return new Mbr(opposite.x, opposite.y, x, y);
			}
		}
		case "leftBottom": {
			if (x < opposite.x && y > opposite.y) {
				return new Mbr(x, opposite.y, opposite.x, y);
			} else if (x > opposite.x && y < opposite.y) {
				return new Mbr(opposite.x, y, x, opposite.y);
			} else if (x > opposite.x) {
				return new Mbr(opposite.x, opposite.y, x, y);
			} else {
				return new Mbr(x, y, opposite.x, opposite.y);
			}
		}
		case "top": {
			if (y < opposite.y) {
				return new Mbr(left, y, right, opposite.y);
			} else {
				return new Mbr(left, opposite.y, right, y);
			}
		}
		case "bottom": {
			if (y > opposite.y) {
				return new Mbr(left, opposite.y, right, y);
			} else {
				return new Mbr(left, y, right, opposite.y);
			}
		}
		case "right": {
			if (x > opposite.x) {
				return new Mbr(opposite.x, top, x, bottom);
			} else {
				return new Mbr(x, top, opposite.x, bottom);
			}
		}
		case "left": {
			if (x < opposite.x) {
				return new Mbr(x, top, opposite.x, bottom);
			} else {
				return new Mbr(opposite.x, top, x, bottom);
			}
		}
	}
}
