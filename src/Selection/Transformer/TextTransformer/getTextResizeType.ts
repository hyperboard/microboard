import { Mbr, Point } from "Board/Items";
import {
	ResizeType,
	getResizeType,
} from "../TransformerHelpers/getResizeType.ts";

/**
 * A funciton to get the resize type of a text item.
 * A text item does not have top and bottom anchors.
 * Unlike other items its top and bottom anchors are split into left and right parts.
 */

export function getTextResizeType(
	cursorPoint: Point,
	cameraScale: number,
	mbr?: Mbr,
	anchorDistance = 5,
): ResizeType | undefined {
	if (!mbr) {
		return undefined;
	}
	const resizeType = getResizeType(
		cursorPoint,
		cameraScale,
		mbr,
		anchorDistance,
	);
	const center = mbr.getCenter();
	if (resizeType === "top") {
		return cursorPoint.x < center.x ? "leftTop" : "rightTop";
	}
	if (resizeType === "bottom") {
		return cursorPoint.x < center.x ? "leftBottom" : "rightBottom";
	}
	return resizeType;
}
