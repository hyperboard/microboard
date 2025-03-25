import { Board } from "./Board";
import { Camera } from "./Camera";
import { Item, Matrix, Mbr } from "./Items";
import { DrawingContext } from "./Items/DrawingContext";
import { TransformManyItems } from "./Items/Transformation/TransformationOperations";
import { SETTINGS } from "./Settings";

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

	/**
	 * Creates new canvas and returns it.
	 * Renders all items from translation on new canvas.
	 * @param mbr - width and height for resulting canvas
	 * @param translation - ids of items to draw on mbr
	 */
	function drawMbrOnCanvas(
		board: Board,
		mbr: Mbr,
		translation: TransformManyItems,
		actualMbr?: Mbr,
	): { canvas: HTMLDivElement; items: Item[] } | undefined {
		const canvas = document.createElement("canvas");
		const width = mbr.getWidth() + 2;
		const height = mbr.getHeight() + 2;
		canvas.width = width * board.camera.getMatrix().scaleX;
		canvas.height = height * board.camera.getMatrix().scaleY;

		const container = document.createElement("div");
		container.id = "selection-canvas";
		container.style.position = "relative";
		container.style.width = `${canvas.width}px`;
		container.style.height = `${canvas.height}px`;
		container.appendChild(canvas);

		if (actualMbr) {
			const leftOffset =
				(actualMbr.left - mbr.left) * board.camera.getMatrix().scaleX;
			const topOffset =
				(actualMbr.top - mbr.top) * board.camera.getMatrix().scaleX;
			const width =
				actualMbr.getWidth() * board.camera.getMatrix().scaleX;
			const height =
				actualMbr.getHeight() * board.camera.getMatrix().scaleY;

			const borderDiv = document.createElement("div");
			borderDiv.id = "canvasBorder";
			borderDiv.style.position = "absolute";
			borderDiv.style.transformOrigin = "left top";
			borderDiv.style.border = `1px solid ${SETTINGS.SELECTION_COLOR}`;
			borderDiv.style.boxSizing = "border-box";
			borderDiv.style.left = `${leftOffset}px`;
			borderDiv.style.top = `${topOffset}px`;
			borderDiv.style.width = `${width}px`;
			borderDiv.style.height = `${height}px`;
			canvas.style.border = "";
			canvas.style.boxSizing = "border-box";
			container.appendChild(borderDiv);
		} else {
			canvas.style.border = `1px solid ${SETTINGS.SELECTION_COLOR}`;
			canvas.style.boxSizing = "border-box";
		}

		const createAnchorDiv = (
			left: string,
			top: string,
			radius: number,
		): HTMLDivElement => {
			const anchorDiv = document.createElement("div");
			anchorDiv.style.position = "absolute";
			anchorDiv.style.width = `${2 * radius}px`;
			anchorDiv.style.height = `${2 * radius}px`;
			anchorDiv.style.backgroundColor = `${SETTINGS.SELECTION_ANCHOR_COLOR}`;
			anchorDiv.style.border = `${SETTINGS.SELECTION_ANCHOR_WIDTH}px solid ${SETTINGS.SELECTION_COLOR}`;
			anchorDiv.style.borderRadius = "2px";
			anchorDiv.style.left = `calc(${left} - ${radius}px)`;
			anchorDiv.style.top = `calc(${top} - ${radius}px)`;
			anchorDiv.style.zIndex = "10";
			return anchorDiv;
		};

		const anchors = [
			createAnchorDiv("0%", "0%", SETTINGS.SELECTION_ANCHOR_RADIUS),
			createAnchorDiv(
				"100% + 1px",
				"0%",
				SETTINGS.SELECTION_ANCHOR_RADIUS,
			),
			createAnchorDiv(
				"0%",
				"100% + 1px",
				SETTINGS.SELECTION_ANCHOR_RADIUS,
			),
			createAnchorDiv(
				"100% + 1px",
				"100% + 1px",
				SETTINGS.SELECTION_ANCHOR_RADIUS,
			),
		];

		const canvasBorder = Array.from(container.children).find(
			child => child.id === "canvasBorder",
		);
		for (const anchor of anchors) {
			if (canvasBorder) {
				canvasBorder.appendChild(anchor);
			} else {
				container.appendChild(anchor);
			}
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			console.error(
				"drawMbrOnCanvas: Unable to get 2D context from canvasElemnt",
				canvas,
			);
			return;
		}

		const camera = new Camera();
		const newCameraMatix = new Matrix(-mbr.left, -mbr.top, 1, 1);
		camera.matrix = newCameraMatix;

		const context = new DrawingContext(camera, ctx);

		context.setCamera(camera);
		context.ctx.setTransform(
			board.camera.getMatrix().scaleX,
			0,
			0,
			board.camera.getMatrix().scaleY,
			0,
			0,
		);
		context.matrix.applyToContext(context.ctx);

		const items = Object.keys(translation)
			.map(id => {
				const item = board.items.getById(id);
				if (item) {
					if (item.itemType !== "Frame") {
						return item;
					}
					item.render(context);
					return item;
				}
				return;
			})
			.filter(item => !!item);
		items.forEach(item => {
			if (item.itemType !== "Frame") {
				item.render(context);
				board.selection.renderItemMbr(
					context,
					item,
					board.camera.getMatrix().scaleX,
				);
			}
		});

		return { canvas: container, items };
	}

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
			const canvas = drawMbrOnCanvas(
				board,
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
