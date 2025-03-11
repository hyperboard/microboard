import { SETTINGS } from "Board/Settings";

export function getMeasureCtx(): Ctx {
	const measureCanvas = SETTINGS.documentFactory.createElement("canvas");
	const measureCtx = measureCanvas.getContext("2d");
	if (!measureCtx) {
		throw new Error("Failde to create canvas and get 2d context");
	}
	return measureCtx;
}
