import { Board } from "Board";
import { Quality, Resolution } from "./types";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Camera } from "Board/Camera";
import { Matrix, Mbr } from "Board/Items";

export interface SnapshotInfo {
	dataUrl: string;
	nameToExport: string;
}

export function exportBoardSnapshot(
	board: Board,
	quality: Quality,
	selection?: Mbr,
	nameToExport?: string,
): SnapshotInfo | undefined {
	const boardId = board.getBoardId();
	const resolution = Resolution[quality];
	const canvas = document.createElement("canvas");

	let { width, height } = board.camera.window;

	if (selection) {
		width = selection.getWidth();
		height = selection.getHeight();
	}

	canvas.width = Math.floor(width * window.devicePixelRatio) * resolution;
	canvas.height = Math.floor(height * window.devicePixelRatio) * resolution;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		console.error("Export Board: Unable to get 2D context");
		return;
	}

	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "white";
	ctx.fill();

	const camera = new Camera();
	const cameraMatrix = board.camera.matrix.copy();
	camera.matrix = cameraMatrix;

	if (selection) {
		const mbrWidth = selection.getWidth();
		const mbrHeight = selection.getHeight();
		const scaleX = width / mbrWidth;
		const scaleY = height / mbrHeight;

		const scale = Math.min(scaleX, scaleY);

		const translationX =
			width / 2 - (selection.left + mbrWidth / 2) * scale;
		const translationY =
			height / 2 - (selection.top + mbrHeight / 2) * scale;

		const selectionMatrix = new Matrix(
			translationX,
			translationY,
			scaleX,
			scaleY,
		);

		camera.matrix = selectionMatrix;
	}

	const context = new DrawingContext(camera, ctx);

	context.setCamera(camera);
	context.ctx.setTransform(
		resolution * context.DPI,
		0,
		0,
		resolution * context.DPI,
		0,
		0,
	);
	context.matrix.applyToContext(context.ctx);

	const mbr = camera.getMbr();

	const { left, top, right, bottom } = mbr;
	const inView = board.items.index.getRectsEnclosedOrCrossed(
		left,
		top,
		right,
		bottom,
	);
	for (const item of inView) {
		item.render(context);
	}

	const dataURL = context.ctx.canvas.toDataURL("image/png");

	const link = document.createElement("a");
	link.href = dataURL;
	link.download = nameToExport
		? `${nameToExport}.png`
		: `board-${boardId}.png`;
	link.click();

	return {
		dataUrl: dataURL,
		nameToExport: nameToExport ?? `board-${boardId}`,
	};
}
