import { Board } from "Board/Board";
import {
	Connector,
	ConnectorData,
	Item,
	Matrix,
	Mbr,
	Point,
	RichText,
	ItemData,
} from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Selection } from "..";
import { SessionStorage } from "../../../App/SessionStorage";
import { getControlPointData } from "./";
import styles from "./QuickAddButtons.module.css";
import { createAINode } from "Board/Selection/QuickAddButtons/quickAddHelpers";

export interface QuickAddButtons {
	clear: () => void;
	render: (context: DrawingContext) => void;
}

export interface QuickAddItems {
	newItem: Item;
	connectorData: ConnectorData;
	connectorStartPoint: Point;
	connectorEndPoint: Point;
}

export interface HTMLQuickAddButton extends HTMLButtonElement {
	isMouseDown: boolean;
	resetState: () => void;
}

const offsets = { minX: 320, maxX: 320, minY: 120, maxY: 240 };

export function getQuickAddButtons(
	selection: Selection,
	board: Board,
): QuickAddButtons {
	let htmlButtons: HTMLQuickAddButton[] | undefined = undefined;
	let quickAddItems: QuickAddItems | undefined = undefined;

	function calculateQuickAddPosition(
		index: number,
		selectedItem: Item,
		connectorStartPoint: Point,
	): { newItem: Item; connectorData: ConnectorData } {
		const connectorStorage = new SessionStorage();
		const currMbr = selectedItem.getMbr();
		const selectedItemData = selectedItem.serialize();
		const width = currMbr.getWidth();
		const height = currMbr.getHeight();
		let offsetX = width;
		let offsetY = height;
		let newWidth = width;
		let newHeight = height;
		let itemData: ItemData;
		if (selectedItem.itemType === "AINode") {
			const node = createAINode(board, selectedItem.getId(), index);
			newWidth = node.getMbr().getWidth();
			newHeight = node.getMbr().getHeight();
			itemData = node.serialize();
			const { minX, minY, maxY, maxX } = offsets;
			offsetX = Math.min(offsetX, maxX);
			offsetX = Math.max(offsetX, minX);
			offsetY = Math.min(offsetY, maxY);
			offsetY = Math.max(offsetY, minY);
		} else {
			itemData = selectedItemData;
		}
		const guarded = itemData as Partial<ItemData>;
		if ("text" in guarded && guarded.itemType !== "AINode") {
			delete guarded.text;
		}

		const iterAdjustment = {
			0: { x: 0, y: -2 * offsetY },
			1: { x: 0, y: -2 * offsetY },
			2: { x: -2 * offsetX, y: 0 },
			3: { x: -2 * offsetX, y: 0 },
		};

		const baseAdjustments = {
			0: { translateX: -offsetX - width, translateY: 0 },
			1: { translateX: offsetX + width, translateY: 0 },
			2: { translateX: 0, translateY: -offsetY - height },
			3: { translateX: 0, translateY: offsetY + height },
		};

		const adjustment = baseAdjustments[index];
		const newItemData = { ...itemData };
		if (newItemData.transformation) {
			newItemData.transformation.translateX =
				adjustment.translateX +
				(selectedItemData.transformation?.translateX || 0);
			newItemData.transformation.translateY =
				adjustment.translateY +
				(selectedItemData.transformation?.translateY || 0) +
				height / 2 -
				newHeight / 2;
		}
		const newMbr = new Mbr(
			newItemData.transformation?.translateX,
			newItemData.transformation?.translateY,
			(newItemData.transformation?.translateX || 0) + newWidth,
			(newItemData.transformation?.translateY || 0) + newHeight,
		);

		let step = 1;
		while (
			board.index
				.getItemsEnclosedOrCrossed(
					newMbr.left,
					newMbr.top,
					newMbr.right,
					newMbr.bottom,
				)
				.filter(item => item.itemType !== "Connector").length > 0
		) {
			const xDirection = step % 2 === 0 ? -1 : 1;
			const yDirection =
				newItemData.itemType === "AINode" ? -1 : xDirection;
			newMbr.transform(
				new Matrix(
					iterAdjustment[index].x * xDirection * step,
					iterAdjustment[index].y *
						yDirection *
						(newItemData.itemType === "AINode" ? 1 : step),
				),
			);
			if (newItemData.transformation) {
				newItemData.transformation.translateX +=
					iterAdjustment[index].x * xDirection * step;
				newItemData.transformation.translateY +=
					iterAdjustment[index].y *
					yDirection *
					(newItemData.itemType === "AINode" ? 1 : step);
			}
			step += 1;
		}

		const endPoints = getQuickButtonsPositions(newMbr);
		const reverseIndexMap = { 0: 1, 1: 0, 2: 3, 3: 2 };
		const connectorEndPoint =
			endPoints?.positions[reverseIndexMap[index]] || new Point();
		const newItem = board.createItem(board.getNewItemId(), newItemData);

		const defaultConnector = new Connector(board);
		const connectorData = defaultConnector.serialize();
		connectorData.lineStyle =
			newItem.itemType === "AINode" ? "curved" : "orthogonal";

		const savedStart = connectorStorage.getConnectorPointer("start");
		if (savedStart) {
			connectorData.startPointerStyle = savedStart;
		}
		const savedEnd = connectorStorage.getConnectorPointer("end");
		if (savedEnd) {
			connectorData.endPointerStyle = savedEnd;
		}

		const startPointData = getControlPointData(selectedItem, index);
		const endPointData = getControlPointData(
			newItem,
			reverseIndexMap[index],
		);
		connectorData.startPoint = startPointData;
		connectorData.endPoint = endPointData;
		connectorData.text = new RichText(board, new Mbr()).serialize();

		quickAddItems = {
			newItem,
			connectorData,
			connectorStartPoint,
			connectorEndPoint,
		};
		return {
			newItem,
			connectorData,
		};
	}

	function clear(): void {
		if (htmlButtons) {
			htmlButtons.forEach(button => {
				button.onclick = null;
				button.onmouseenter = null;
				button.onmouseleave = null;
				button.onmousedown = null;
				button.resetState = () => {};
				button.remove();
			});
			htmlButtons = undefined;
			quickAddItems = undefined;
		}
	}

	/** @returns positions of left, right, top, bottom points */
	function getQuickButtonsPositions(
		customMbr?: Mbr,
	): { positions: Point[]; item: Item } | undefined {
		const single = selection.items.getSingle();
		const itemMbr = customMbr ? customMbr : single?.getMbr();
		if (
			!itemMbr ||
			(single?.itemType !== "Sticker" &&
				single?.itemType !== "Shape" &&
				single?.itemType !== "AINode")
		) {
			return;
		}

		const center = itemMbr.getCenter();
		const width = itemMbr.getWidth();
		const height = itemMbr.getHeight();
		const positions = [
			new Point(center.x - width / 2, center.y),
			new Point(center.x + width / 2, center.y),
			new Point(center.x, center.y - height / 2),
			new Point(center.x, center.y + height / 2),
		];
		return {
			positions,
			item: single,
		};
	}

	function renderQuickAddItems(context: DrawingContext): void {
		if (quickAddItems) {
			const connectorData = { ...quickAddItems.connectorData };
			const { newItem } = quickAddItems;
			connectorData.optionalFindItemFn = () => newItem;

			const floatingConnector = board.createItem("", connectorData);
			const originalAlpha = context.ctx.globalAlpha;
			context.ctx.globalAlpha = 0.6;

			newItem.render(context);
			floatingConnector.render(context);

			context.ctx.globalAlpha = originalAlpha;
		}
	}

	function renderQuickAddButtons(): void {
		if (board.getInterfaceType() !== "edit") {
			clear();
			return;
		}
		const position = getQuickButtonsPositions();
		if (!position) {
			clear();
			return;
		}
		const { positions, item } = position;

		const cameraMatrix = board.camera.getMatrix();
		const cameraMbr = board.camera.getMbr();
		const positionAdjustments = {
			0: { left: -20, top: 0, rotate: "left" },
			1: { left: 20, top: 0, rotate: "right" },
			2: { left: 0, top: -20, rotate: "top" },
			3: { left: 0, top: 20, rotate: "bottom" },
		};

		const existingButtons = htmlButtons;
		if (existingButtons) {
			positions.forEach((pos, index) => {
				const adjustment = positionAdjustments[index] || {
					left: 0,
					top: 0,
				};
				existingButtons[index].style.left = `${
					(pos.x - cameraMbr.left) * cameraMatrix.scaleX +
					adjustment.left
				}px`;
				existingButtons[index].style.top = `${
					(pos.y - cameraMbr.top) * cameraMatrix.scaleY +
					adjustment.top
				}px`;
			});
		} else {
			htmlButtons = positions.map((pos, index) => {
				const adjustment = positionAdjustments[index] || {
					left: 0,
					top: 0,
					rotate: "right",
				};
				const button = document.createElement(
					"button",
				) as HTMLQuickAddButton;
				button.classList.add(styles.quickAddButton);
				if (item.itemType === "AINode" && index === 2) {
					button.classList.add(styles.invisible);
				}
				button.classList.add(styles[adjustment.rotate]);
				button.style.left = `${
					(pos.x - cameraMbr.left) * cameraMatrix.scaleX +
					adjustment.left
				}px`;
				button.style.top = `${
					(pos.y - cameraMbr.top) * cameraMatrix.scaleY +
					adjustment.top
				}px`;

				button.resetState = () => {
					button.isMouseDown = false;
				};
				button.resetState();

				button.onmouseleave = () => {
					if (button.isMouseDown) {
						board.tools.addConnector(true, item, pos);
					} else {
						quickAddItems = undefined;
						selection.subject.publish(selection);
					}
					button.resetState();
				};
				button.ontouchmove = () => {
					if (button.onmouseleave) {
						button.onmouseleave(new MouseEvent("mouseleave"));
					}
				};

				button.onmouseenter = () => {
					const selectedItem = selection.items.getSingle();
					if (!selectedItem) {
						return;
					}
					calculateQuickAddPosition(
						index,
						selectedItem,
						positions[index],
					);
					selection.subject.publish(selection);
				};

				button.onmousedown = () => {
					button.isMouseDown = true;
				};
				button.ontouchstart = () => {
					if (button.onmousedown) {
						button.onmousedown(new MouseEvent("mousedown"));
					}
				};

				button.onclick = () => {
					if (!quickAddItems) {
						button.resetState();
						return;
					}
					const { newItem, connectorData } = quickAddItems;

					const mergeStamp = Date.now();
					const addedItem = board.add(newItem, mergeStamp);
					if ("itemId" in connectorData.endPoint) {
						connectorData.endPoint.itemId = addedItem.getId();
					}
					board.add(
						board.createItem(board.getNewItemId(), connectorData),
						mergeStamp,
					);

					quickAddItems = undefined;
					selection.removeAll();
					selection.add(addedItem);
					board.selection.editText();
					board.camera.addToView(
						addedItem.getMbr(),
						board.items.getInView(),
					);
					button.resetState();
				};

				return document.body.appendChild(button);
			});
		}
	}

	return {
		clear,
		render: (context: DrawingContext) => {
			renderQuickAddItems(context);
			renderQuickAddButtons();
		},
	};
}
