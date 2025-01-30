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
import { isMicroboard } from "lib/isMicroboard";
import { Selection } from "..";
import { SessionStorage } from "../../../App/SessionStorage";
import { getControlPointData } from "./";
import styles from "./QuickAddButtons.module.css";

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
		const itemData = selectedItem.serialize();
		const guarded = itemData as Partial<ItemData>;
		if ("text" in guarded) {
			delete guarded.text;
		}
		const width = currMbr.getWidth();
		const height = currMbr.getHeight();

		const iterAdjustment = {
			0: { x: 0, y: -2 * height },
			1: { x: 0, y: -2 * height },
			2: { x: -2 * width, y: 0 },
			3: { x: -2 * width, y: 0 },
		};

		const baseAdjustments = {
			0: { translateX: -width * 2, translateY: 0 },
			1: { translateX: width * 2, translateY: 0 },
			2: { translateX: 0, translateY: -height * 2 },
			3: { translateX: 0, translateY: height * 2 },
		};

		const adjustment = baseAdjustments[index];
		const newItemData = { ...itemData };
		if (newItemData.transformation) {
			newItemData.transformation.translateX += adjustment.translateX;
			newItemData.transformation.translateY += adjustment.translateY;
		}
		const newMbr = currMbr
			.copy()
			.getTransformed(
				new Matrix(adjustment.translateX, adjustment.translateY),
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
			const direction = step % 2 === 0 ? -1 : 1;
			newMbr.transform(
				new Matrix(
					iterAdjustment[index].x * direction * step,
					iterAdjustment[index].y * direction * step,
				),
			);
			if (newItemData.transformation) {
				newItemData.transformation.translateX +=
					iterAdjustment[index].x * direction * step;
				newItemData.transformation.translateY +=
					iterAdjustment[index].y * direction * step;
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
		connectorData.lineStyle = "orthogonal";

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
			(single?.itemType !== "Sticker" && single?.itemType !== "Shape")
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
		if (!isMicroboard() || board.getInterfaceType() !== "edit") {
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
					board.fitMbrInView(addedItem.getMbr());
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
