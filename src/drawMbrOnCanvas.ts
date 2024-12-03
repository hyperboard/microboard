import { Board } from "./Board";
import { Item, Matrix, Mbr } from "./Items";
import { TransformManyItems } from "./Items/Transformation/TransformationOperations";

export interface CanvasDrawer {
	getLastCreatedCanvas: () => HTMLDivElement | undefined;
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
		actualMbr?: Mbr,
	) => void;
	countSumMbr: (translation: TransformManyItems) => Mbr | undefined;
	highlightNesting: () => void;
}

export default function createCanvasDrawer(board: Board): CanvasDrawer {
	let lastCreatedCanvas: HTMLDivElement | undefined = undefined;
	let lastTranslationKeys: string[] | undefined = undefined;
	let drawnItems: Item[] | undefined = undefined;
	let matrix = new Matrix();
	const highlightedDivs = new Map<string, HTMLDivElement>();

	function getLastCreatedCanvas(): HTMLDivElement | undefined {
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
			const anchors = lastCreatedCanvas.querySelectorAll("div");
			anchors.forEach(anchor => {
				anchor.style.transform = `scale(${1 / matrix.scaleX}, ${1 / matrix.scaleY})`;
			});
		}
	}

	function scaleCanvasTo(scaleX: number, scaleY: number): void {
		if (lastCreatedCanvas) {
			matrix.scaleX = scaleX;
			matrix.scaleY = scaleY;
			lastCreatedCanvas.style.transformOrigin = "top left";
			lastCreatedCanvas.style.transform = `scale(${matrix.scaleX}, ${matrix.scaleY})`;
			const anchors = lastCreatedCanvas.querySelectorAll("div");
			anchors.forEach(anchor => {
				anchor.style.transform = `scale(${1 / matrix.scaleX}, ${1 / matrix.scaleY})`;
			});
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
					// @ts-expect-error different types of items output the type never
					item.subject.publish(item);
				}
			});
			lastTranslationKeys = undefined;
			board.selection.shouldPublish = true;
		}

		board.selection.transformationRenderBlock = undefined;
		board.selection.subject.publish(board.selection);
		drawnItems = undefined;
		matrix = new Matrix();
	}

	function updateCanvasAndKeys(
		sumMbr: Mbr,
		translation: TransformManyItems,
		resizingMatrix?: Matrix,
		actualMbr?: Mbr,
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
			const canvas = board.drawMbrOnCanvas(
				sumMbr,
				translation,
				actualMbr,
			);
			if (canvas) {
				const { canvas: cnvs, items } = canvas;
				drawnItems = items;
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
					if (item.itemType === "Frame") {
						mbr.combine(item.getRichText().getMbr());
					}
				}
			}
			return mbr;
		}, undefined);
	}

	function createBorderDivForItem(
		itemMbr: Mbr,
		container: HTMLDivElement,
	): HTMLDivElement {
		const containerLeft = parseFloat(container.style.left || "0");
		const containerTop = parseFloat(container.style.top || "0");
		const currMatrix = getMatrix();
		const cameraMatrix = board.camera.getMatrix();
		// TODO fix scaling
		const leftOffset =
			((itemMbr.left - board.camera.getMbr().left) * cameraMatrix.scaleX -
				containerLeft) /
			currMatrix.scaleX;
		const topOffset =
			((itemMbr.top - board.camera.getMbr().top) * cameraMatrix.scaleY -
				containerTop) /
			currMatrix.scaleY;
		const width = itemMbr.getWidth() * board.camera.getMatrix().scaleX;
		const height = itemMbr.getHeight() * board.camera.getMatrix().scaleY;

		const borderDiv = document.createElement("div");
		borderDiv.style.position = "absolute";
		borderDiv.style.backgroundColor = "rgb(128, 128, 128, 0.5)";
		borderDiv.style.boxSizing = "border-box";
		borderDiv.style.left = `${leftOffset}px`;
		borderDiv.style.top = `${topOffset}px`;
		borderDiv.style.width = `${width}px`;
		borderDiv.style.height = `${height}px`;
		borderDiv.style.transform = `scale(${1 / currMatrix.scaleX}, ${1 / currMatrix.scaleY})`;
		borderDiv.style.pointerEvents = "none";

		container.appendChild(borderDiv);
		return borderDiv;
	}

	function highlightNesting(): void {
		const container = getLastCreatedCanvas();
		const drawnItemsMap = drawnItems?.reduce((acc, item) => {
			acc.set(item.getId(), { item, mbr: item.getMbr() });
			return acc;
		}, new Map<string, { item: Item; mbr: Mbr }>());
		if (!container || !drawnItems) {
			return;
		}
		const left = parseFloat(container.style.left || "0");
		const top = parseFloat(container.style.top || "0");
		const width = parseFloat(container.style.width || "0");
		const height = parseFloat(container.style.height || "0");

		const currMatrix = getMatrix();
		const cameraMbr = board.camera.getMbr();
		const cameraMatrix = board.camera.getMatrix();
		const realLeft = left / cameraMatrix.scaleX + cameraMbr.left;
		const realTop = top / cameraMatrix.scaleY + cameraMbr.top;
		const transform = container.style.transform;
		let scaleX = 1,
			scaleY = 1;
		if (transform) {
			const match = transform.match(/scale\(([^,]+),\s*([^)]+)\)/);
			if (match) {
				scaleX = parseFloat(match[1]);
				scaleY = parseFloat(match[2]);
			}
		}

		const adjustedWidth = (width / cameraMatrix.scaleX) * scaleX;
		const adjustedHeight = (height / cameraMatrix.scaleY) * scaleY;
		const realRight = realLeft + adjustedWidth;
		const realBottom = realTop + adjustedHeight;

		const containerMbr = new Mbr(realLeft, realTop, realRight, realBottom);
		const frames = board.items.getFramesEnclosedOrCrossed(
			containerMbr.left,
			containerMbr.top,
			containerMbr.right,
			containerMbr.bottom,
		);
		if (frames) {
			drawnItemsMap?.forEach(({ mbr }) => {
				mbr.transform(currMatrix);
			});
			frames.forEach(frame => {
				drawnItemsMap?.forEach(({ mbr, item }, key) => {
					if (item.itemType === "Frame") {
						return;
					}
					if (
						lastCreatedCanvas &&
						(!drawnItemsMap.get(frame.getId()) ||
							item.parent !== frame.getId()) &&
						frame.handleNesting(mbr)
					) {
						const div = createBorderDivForItem(
							mbr,
							lastCreatedCanvas,
						);
						removeHighlighted(key);
						highlightedDivs.set(key, div);
					} else {
						removeHighlighted(key);
					}
				});
			});
		}
	}

	function removeHighlighted(id: string): void {
		const added = highlightedDivs.get(id);
		if (added) {
			added.remove();
		}
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
		highlightNesting,
	};
}
