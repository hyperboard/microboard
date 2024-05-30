import { Board } from "Board/Board";
import { Mbr } from "./Items";
import { TransformManyItems } from "./Items/Transformation/TransformationOperations";

export default function createCanvasDrawer(board: Board): {
	lastCreatedCanvas?: HTMLCanvasElement;
	lastTranslationKeys?: string[];
	clearCanvasAndKeys: () => void;
	updateCanvasAndKeys: (sumMbr: Mbr, translation: TransformManyItems) => void;
	countSumMbr: (translation: TransformManyItems) => Mbr | undefined;
} {
	let lastCreatedCanvas: HTMLCanvasElement | undefined = undefined;
	let lastTranslationKeys: string[] | undefined = undefined;

	function clearCanvasAndKeys(): void {
		if (lastCreatedCanvas) {
			lastCreatedCanvas.remove();
			lastCreatedCanvas = undefined;
		}
		if (lastTranslationKeys) {
			lastTranslationKeys.forEach(id => {
				const item = board.items.getById(id);
				if (item) {
					item.transformationRenderBlock = undefined;
				}
			});
			lastTranslationKeys = undefined;
		}
		board.selection.transformationRenderBlock = undefined;
	}

	function updateCanvasAndKeys(
		sumMbr: Mbr,
		translation: TransformManyItems,
	): void {
		const translationKeys = Object.keys(translation);
		if (
			lastCreatedCanvas &&
			lastTranslationKeys?.length === translationKeys.length &&
			lastTranslationKeys?.every(key => translationKeys.includes(key))
		) {
			lastCreatedCanvas.style.left = `${
				(sumMbr.left - board.camera.getMbr().left) *
				board.camera.getMatrix().scaleX
			}px`;
			lastCreatedCanvas.style.top = `${
				(sumMbr.top - board.camera.getMbr().top) *
				board.camera.getMatrix().scaleY
			}px`;
		} else {
			const cnvs = board.drawMbrOnCanvas(sumMbr);
			if (cnvs) {
				cnvs.style.position = "absolute";
				cnvs.style.zIndex = "100";
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
		lastCreatedCanvas,
		lastTranslationKeys,
		clearCanvasAndKeys,
		updateCanvasAndKeys,
		countSumMbr,
	};
}
