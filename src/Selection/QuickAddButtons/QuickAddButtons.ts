import { ConnectorData, Matrix, RichText, Mbr, Item, Point } from "Board/Items";
import { ControlPointData } from "Board/Items/Connector/ControlPoint";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Selection } from "..";
import { Board } from "Board/Board";
import { isMicroboard } from "lib/isMicroboard";

export interface QuickAddButtons {
	calculateQuickAddPosition: (
		index: number,
		selectedItem: Item,
		connectorStartPoint: Point,
	) => { newItem: Item; connectorData: ConnectorData };
	clear: () => void;
	getQuickButtonsPositions: (customMbr?: Mbr) => Point[] | undefined;
	render: (context: DrawingContext) => void;
	htmlButtons?: HTMLButtonElement[];
	quickAddItems?: QuickAddItems;
}

export interface QuickAddItems {
	newItem: Item;
	connectorData: ConnectorData;
	connectorStartPoint: Point;
	connectorEndPoint: Point;
}

export function getQuickAddButtons(
	selection: Selection,
	board: Board,
): QuickAddButtons {
	let htmlButtons: HTMLButtonElement[] | undefined = undefined;
	let quickAddItems: QuickAddItems | undefined = undefined;

	function calculateQuickAddPosition(
		index: number,
		selectedItem: Item,
		connectorStartPoint: Point,
	): { newItem: Item; connectorData: ConnectorData } {
		const currMbr = selectedItem.getMbr();
		const itemData = selectedItem.serialize();
		delete itemData.text;
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
		newItemData.transformation.translateX += adjustment.translateX;
		newItemData.transformation.translateY += adjustment.translateY;
		const newMbr = currMbr
			.copy()
			.getTransformed(
				new Matrix(adjustment.translateX, adjustment.translateY),
			);

		const boardItems = board.items.listAll();
		let step = 1;

		while (
			boardItems.some(item => item.getMbr().isEnclosedOrCrossedBy(newMbr))
		) {
			const direction = step % 2 === 0 ? -1 : 1;
			newMbr.transform(
				new Matrix(
					iterAdjustment[index].x * direction * step,
					iterAdjustment[index].y * direction * step,
				),
			);
			newItemData.transformation.translateX +=
				iterAdjustment[index].x * direction * step;
			newItemData.transformation.translateY +=
				iterAdjustment[index].y * direction * step;
			step += 1;
		}

		const endPoints = getQuickButtonsPositions(newMbr);
		const reverseIndexMap = { 0: 1, 1: 0, 2: 3, 3: 2 };
		const connectorEndPoint =
			endPoints?.[reverseIndexMap[index]] || new Point();
		const newItem = board.createItem(board.getNewItemId(), newItemData);

		const connectorData = new ConnectorData();
		connectorData.lineStyle = "orthogonal";

		const selectedItemScale = selectedItem.transformation.getScale();
		const adjMapScaled = {
			0: { x: 0, y: height / 2 / selectedItemScale.y },
			1: {
				x: width / selectedItemScale.x,
				y: height / 2 / selectedItemScale.y,
			},
			2: { x: width / 2 / selectedItemScale.x, y: 0 },
			3: {
				x: width / 2 / selectedItemScale.x,
				y: height / selectedItemScale.y,
			},
		};

		const startPointData: ControlPointData = {
			pointType: "Fixed",
			itemId: selectedItem.getId(),
			relativeX:
				newItem.itemType === "Shape"
					? adjMapScaled[index].x
					: adjMapScaled[index].x / 2,
			relativeY:
				newItem.itemType === "Shape"
					? adjMapScaled[index].y
					: adjMapScaled[index].y / 2,
		};
		const endPointData: ControlPointData = {
			pointType: "Fixed",
			itemId: newItem.getId(),
			relativeX:
				newItem.itemType === "Shape"
					? adjMapScaled[reverseIndexMap[index]].x
					: adjMapScaled[reverseIndexMap[index]].x / 2,
			relativeY:
				newItem.itemType === "Shape"
					? adjMapScaled[reverseIndexMap[index]].y
					: adjMapScaled[reverseIndexMap[index]].y / 2,
		};
		connectorData.startPoint = startPointData;
		connectorData.endPoint = endPointData;
		connectorData.text = new RichText(new Mbr()).serialize();

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
				button.remove();
			});
			htmlButtons = undefined;
			quickAddItems = undefined;
		}
	}

	function getQuickButtonsPositions(customMbr?: Mbr): Point[] | undefined {
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
		return positions;
	}

	function renderQuickAddItems(context: DrawingContext): void {
		if (quickAddItems) {
			const connectorData = { ...quickAddItems.connectorData };
			const { newItem } = quickAddItems;
			connectorData.optionalFindItemFn = () => newItem;

			const floatingConnector = board.createItem("", connectorData);
			const originalAlpha = context.ctx.globalAlpha;
			context.ctx.globalAlpha = 0.33;

			newItem.render(context);
			floatingConnector.render(context);

			context.ctx.globalAlpha = originalAlpha;
		}
	}

	function renderQuickAddButtons(): void {
		if (!isMicroboard()) {
			clear();
			return;
		}
		const positions = getQuickButtonsPositions();
		if (!positions) {
			clear();
			return;
		}

		const cameraMatrix = board.camera.getMatrix();
		const cameraMbr = board.camera.getMbr();
		const positionAdjustments = {
			0: { left: -10, top: 0 },
			1: { left: 10, top: 0 },
			2: { left: 0, top: -10 },
			3: { left: 0, top: 10 },
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
				};
				const button = document.createElement("button");
				button.style.position = "absolute";
				button.style.transformOrigin = "left top";
				button.style.transform = `translate(-50%, -50%)`;
				button.style.left = `${
					(pos.x - cameraMbr.left) * cameraMatrix.scaleX +
					adjustment.left
				}px`;
				button.style.top = `${
					(pos.y - cameraMbr.top) * cameraMatrix.scaleY +
					adjustment.top
				}px`;
				button.style.zIndex = "25";
				button.style.padding = "3px";
				button.style.backgroundColor = "rgb(71, 120, 245)";
				button.style.borderRadius = "50%";

				button.onmouseleave = () => {
					quickAddItems = undefined;
					selection.subject.publish(selection);
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

				button.onclick = () => {
					if (!quickAddItems) {
						return;
					}
					const { newItem, connectorData } = quickAddItems;

					const addedItem = board.add(newItem);
					if ("itemId" in connectorData.endPoint) {
						connectorData.endPoint.itemId = addedItem.getId();
					}
					board.add(
						board.createItem(board.getNewItemId(), connectorData),
					);

					quickAddItems = undefined;
					selection.removeAll();
					selection.add(addedItem);
					board.selection.editText();
					board.fitMbrInView(addedItem.getMbr());
				};

				return document.body.appendChild(button);
			});
		}
	}

	return {
		calculateQuickAddPosition,
		clear,
		getQuickButtonsPositions,
		render: (context: DrawingContext) => {
			renderQuickAddItems(context);
			renderQuickAddButtons();
		},
		get htmlButtons() {
			return htmlButtons;
		},
		get quickAddItems() {
			return quickAddItems;
		},
	};
}
