import { ResizeType } from "./getResizeType";

export type AnchorType =
	| "default"
	| "nw-resize"
	| "n-resize"
	| "ne-resize"
	| "e-resize"
	| "se-resize"
	| "s-resize"
	| "sw-resize"
	| "w-resize";

export function getAnchorFromResizeType(resizeType?: ResizeType): AnchorType {
	switch (resizeType) {
		case "leftTop":
			return "nw-resize";
		case "rightBottom":
			return "se-resize";
		case "rightTop":
			return "ne-resize";
		case "leftBottom":
			return "sw-resize";
		case "top":
			return "n-resize";
		case "bottom":
			return "s-resize";
		case "right":
			return "e-resize";
		case "left":
			return "w-resize";
		default:
			return "default";
	}
}
