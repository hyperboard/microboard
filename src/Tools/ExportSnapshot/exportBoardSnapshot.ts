import { Board } from 'Board';
import { Camera } from 'Camera';
import { Mbr, Matrix } from 'Items';
import { DrawingContext } from 'Items/DrawingContext';

export interface SnapshotInfo {
	dataUrl: string;
	nameToExport: string;
}

type Args = {
	board: Board;
	bgColor?: string;
	selection: Mbr;
	nameToExport?: string;
	upscaleTo?: number;
	upscaleBy?: number;
};

export async function exportBoardSnapshot({
	board,
	bgColor = 'white',
	selection,
	nameToExport,
	upscaleTo,
	upscaleBy,
}: Args): Promise<SnapshotInfo> {
	const start = performance.now();
	const boardId = board.getBoardId();
	const offscreenCanvas = new OffscreenCanvas(0, 0);
	const scale = board.camera.getScale();
	const width = selection.getWidth() * scale;
	const height = selection.getHeight() * scale;

	if (!upscaleTo && !upscaleBy) {
		throw new Error('Either upscaleTo or upscaleBy must be provided');
	}

	const upscaleFactor = upscaleBy ?? upscaleTo! / Math.max(width, height);

	offscreenCanvas.width = Math.floor(width * upscaleFactor);
	offscreenCanvas.height = Math.floor(height * upscaleFactor);

	const ctx = offscreenCanvas.getContext('2d');
	if (!ctx) {
		throw new Error('Export Board: Unable to get 2D context');
	}

	ctx.rect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
	ctx.fillStyle = bgColor;
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

		const translationX = width / 2 - (selection.left + mbrWidth / 2) * scale;
		const translationY = height / 2 - (selection.top + mbrHeight / 2) * scale;

		const selectionMatrix = new Matrix(translationX, translationY, scaleX, scaleY);

		camera.matrix = selectionMatrix;
	}

	const context = new DrawingContext(camera, ctx);

	context.setCamera(camera);
	context.ctx.setTransform(upscaleFactor, 0, 0, upscaleFactor, 0, 0);
	context.matrix.applyToContext(context.ctx);

	const { left, top, right, bottom } = selection;
	const inView = board.items.index.getRectsEnclosedOrCrossed(left, top, right, bottom);

	for (const item of inView) {
		item.render(context);
	}

	const blob = await offscreenCanvas.convertToBlob({ type: 'image/png' });
	const dataUrl = await convertBlobToDataUrl(blob);

	if (!dataUrl) {
		throw new Error('Export Board: Unable to convert to data URL');
	}

	const link = document.createElement('a');
	link.href = dataUrl;
	link.download = nameToExport ? `${nameToExport}.png` : `board-${boardId}.png`;
	link.click();

	const end = performance.now();
	console.log('export performance', end - start);
	return {
		dataUrl,
		nameToExport: nameToExport ?? `board-${boardId}`,
	};
}

function convertBlobToDataUrl(blob: Blob): Promise<string | null> {
	const reader = new FileReader();
	reader.readAsDataURL(blob);

	return new Promise(res => {
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				res(reader.result);
			}
			res(null);
		};
	});
}
