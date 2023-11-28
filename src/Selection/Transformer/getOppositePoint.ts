import { Mbr, Point } from "Board/Items";
import { ResizeType } from "./getResizeType";

export function getOppositePoint(resizeType: ResizeType, mbr: Mbr): Point {
	switch (resizeType) {
		case "leftTop": {
			return new Point(mbr.right, mbr.bottom);
		}
		case "rightBottom": {
			return new Point(mbr.left, mbr.top);
		}
		case "rightTop": {
			return new Point(mbr.left, mbr.bottom);
		}
		case "leftBottom": {
			return new Point(mbr.right, mbr.top);
		}
		case "top": {
			return new Point(mbr.left, mbr.bottom);
		}
		case "bottom": {
			return new Point(mbr.left, mbr.top);
		}
		case "right": {
			return new Point(mbr.left, mbr.top);
		}
		case "left": {
			return new Point(mbr.right, mbr.top);
		}
	}
}
