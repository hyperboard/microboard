import { Board } from "./Board";
import { Matrix, Mbr } from "./Items";
import { TransformManyItems } from "./Items/Transformation/TransformationOperations";

export default function createCanvasDrawer(board: Board): {
	getLastCreatedCanvas: () => HTMLCanvasElement | undefined;
	getLastTranslationKeys: () => string[] | undefined;
	getMatrix: () => Matrix;
	translateCanvasBy: (x: number, y: number) => void;
	recoordinateCanvas: (sumMbr: Mbr) => void;
	scaleCanvasBy: (scaleX: number, scaleY: number) => void;
	scaleCanvasTo: (scaleX: number, scaleY: number) => void;
	clearCanvasAndKeys: () => void;
	updateCanvasAndKeys: (
		sumMbr: Mbr,
		translation: TransformManyItems,
		resizingMatrix?: Matrix,
	) => void;
	countSumMbr: (translation: TransformManyItems) => Mbr | undefined;
} {
	let lastCreatedCanvas: HTMLCanvasElement | undefined = undefined;
	let lastTranslationKeys: string[] | undefined = undefined;
	let matrix = new Matrix();

	function getLastCreatedCanvas(): HTMLCanvasElement | undefined {
		return lastCreatedCanvas;
	}

	function getLastTranslationKeys(): string[] | undefined {
		return lastTranslationKeys;
	}

	function getMatrix(): Matrix {
		return matrix;
	}

	function translateCanvasBy(x: number, y: number): void {
		if (lastCreatedCanvas) {
			matrix.translate(x, y);
			const currentLeft = parseFloat(lastCreatedCanvas.style.left || "0");
			const currentTop = parseFloat(lastCreatedCanvas.style.top || "0");
			lastCreatedCanvas.style.left = `${
				currentLeft + x * board.camera.getMatrix().scaleX
			}px`;
			lastCreatedCanvas.style.top = `${
				currentTop + y * board.camera.getMatrix().scaleY
			}px`;
		}
	}

	function recoordinateCanvas(sumMbr: Mbr): void {
		if (lastCreatedCanvas) {
			lastCreatedCanvas.style.left = `${
				(sumMbr.left - board.camera.getMbr().left) *
				board.camera.getMatrix().scaleX
			}px`;
			lastCreatedCanvas.style.top = `${
				(sumMbr.top - board.camera.getMbr().top) *
				board.camera.getMatrix().scaleY
			}px`;
			matrix = new Matrix();
		}
	}

	function scaleCanvasBy(scaleX: number, scaleY: number): void {
		if (lastCreatedCanvas) {
			matrix.scale(scaleX, scaleY);
			lastCreatedCanvas.style.transformOrigin = "top left";
			lastCreatedCanvas.style.transform = `scale(${matrix.scaleX}, ${matrix.scaleY})`;
		}
	}

	function scaleCanvasTo(scaleX: number, scaleY: number): void {
		if (lastCreatedCanvas) {
			matrix.scaleX = scaleX;
			matrix.scaleY = scaleY;
			lastCreatedCanvas.style.transformOrigin = "top left";
			lastCreatedCanvas.style.transform = `scale(${matrix.scaleX}, ${matrix.scaleY})`;
		}
	}

	function clearCanvasAndKeys(): void {
		if (lastCreatedCanvas) {
			lastCreatedCanvas.remove();
			lastCreatedCanvas = undefined;
		}
		if (lastTranslationKeys) {
			board.selection.shouldPublish = false;
			lastTranslationKeys.forEach(id => {
				const item = board.items.getById(id);
				if (item) {
					item.transformationRenderBlock = undefined;
					item.subject.publish(item);
				}
			});
			lastTranslationKeys = undefined;
			board.selection.shouldPublish = true;
		}
		board.selection.transformationRenderBlock = undefined;
		board.selection.subject.publish(board.selection);
		matrix = new Matrix();
	}

	function updateCanvasAndKeys(
		sumMbr: Mbr,
		translation: TransformManyItems,
		resizingMatrix?: Matrix,
	): void {
		const translationKeys = Object.keys(translation);
		if (
			lastCreatedCanvas &&
			lastTranslationKeys?.length === translationKeys.length &&
			lastTranslationKeys?.every(key => translationKeys.includes(key))
		) {
			recoordinateCanvas(sumMbr);
			if (resizingMatrix) {
				scaleCanvasBy(resizingMatrix.scaleX, resizingMatrix.scaleY);
			}
		} else {
			const cnvs = board.drawMbrOnCanvas(sumMbr, translation);
			if (cnvs) {
				cnvs.style.position = "absolute";
				cnvs.style.zIndex = "50";
				cnvs.style.left = `${
					(sumMbr.left - board.camera.getMbr().left) *
					board.camera.getMatrix().scaleX
				}px`;
				cnvs.style.top = `${
					(sumMbr.top - board.camera.getMbr().top) *
					board.camera.getMatrix().scaleY
				}px`;
				cnvs.style.pointerEvents = "none";
				document.body.appendChild(cnvs);
				lastCreatedCanvas = cnvs;
				lastTranslationKeys = Object.keys(translation);
				lastTranslationKeys.forEach(id => {
					const item = board.items.getById(id);
					if (item) {
						item.transformationRenderBlock = true;
					}
				});
				board.selection.transformationRenderBlock = true;
				board.selection.subject.publish(board.selection);
			}
		}
	}

	function countSumMbr(translation: TransformManyItems): Mbr | undefined {
		return Object.keys(translation).reduce((mbr: Mbr | undefined, id) => {
			const item = board.items.getById(id);
			if (item) {
				if (!mbr) {
					mbr = item.getMbr();
				} else {
					mbr.combine(item.getMbr());
				}
			}
			return mbr;
		}, undefined);
	}

	return {
		getLastCreatedCanvas,
		getLastTranslationKeys,
		getMatrix,
		translateCanvasBy,
		recoordinateCanvas,
		scaleCanvasBy,
		scaleCanvasTo,
		clearCanvasAndKeys,
		updateCanvasAndKeys,
		countSumMbr,
	};
}
