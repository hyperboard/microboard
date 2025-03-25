import { conf } from "Board/Settings";
import type { BrowserPath2D } from "./BrowserPath2DFactory";
import type { NodePath2D } from "./NodePath2DFactory";

export function initPaths(
	path2D: typeof BrowserPath2D | typeof NodePath2D,
): void {
	conf.EXPORT_FRAME_DECORATIONS = {
		"top-left": {
			path: new path2D("M13 1H1V13"),
			lineWidth: 2,
			color: "black",
			width: 12,
			height: 12,
			offsetX: -3,
			offsetY: -3,
		},
		"top-right": {
			path: new path2D("M0 1H12V13"),
			lineWidth: 2,
			color: "black",
			width: 12,
			height: 12,
			offsetX: -10,
			offsetY: -3,
		},
		"bottom-left": {
			path: new path2D("M13 12H1V0"),
			lineWidth: 2,
			color: "black",
			width: 12,
			height: 12,
			offsetX: -3,
			offsetY: -10,
		},
		"bottom-right": {
			path: new path2D("M0 12H12V0"),
			lineWidth: 2,
			color: "black",
			width: 12,
			height: 12,
			offsetX: -10,
			offsetY: -10,
		},
	};
}
