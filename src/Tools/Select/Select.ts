import { Board } from "Board";
import { Item, Line, Mbr, Point } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Tool } from "Board/Tools/Tool";
import { SELECTION_BACKGROUND, SELECTION_COLOR } from "View/Tools/Selection";

export class Select extends Tool {
	line: null | Line = null;
	rect: null | Mbr = null;
	downOnItem: null | Item = null;

	isDrawingRectangle = false;
	isDraggingBoard = false;
	isDraggingSelection = false;
	isDraggingUnselectedItem = false;
	isDownOnSelection = false;
	isDownOnBoard = false;
	isDownOnUnselectedItem = false;
	isLeftDown = false;
	isRightDown = false;
	isMiddleDown = false;
	isMovedAfterDown = false;
	isCtrl = false;
	lastPointerMoveEventTime = Date.now();

	constructor(private board: Board) {
		super();
	}

	clear(): void {
		this.isDrawingRectangle = false;
		this.isDraggingBoard = false;
		this.isDraggingSelection = false;
		this.isDraggingUnselectedItem = false;
		this.isDownOnSelection = false;
		this.isDownOnBoard = false;
		this.isDownOnUnselectedItem = false;
		this.isLeftDown = false;
		this.isRightDown = false;
		this.isMiddleDown = false;
		this.isMovedAfterDown = false;
		this.line = null;
		this.rect = null;
		this.downOnItem = null;
		this.lastPointerMoveEventTime = Date.now();
	}

	leftButtonDown(): boolean {
		if (this.isRightDown || this.isMiddleDown) {
			return false;
		}
		this.clear();
		this.isLeftDown = true;
		const { items, selection, pointer } = this.board;

		const selectionMbr = selection.getMbr();
		this.isDownOnSelection =
			selectionMbr !== undefined &&
			selectionMbr.isUnderPoint(pointer.point);
		this.isDraggingSelection = this.isDownOnSelection;
		if (this.isDraggingSelection) {
			return false;
		}

		const hover = items.getUnderPointer();
		this.isDownOnBoard = hover.length === 0;
		this.isDrawingRectangle = this.isDownOnBoard;
		if (this.isDrawingRectangle) {
			const { x, y } = pointer.point;
			this.line = new Line(new Point(x, y), new Point(x, y));
			this.rect = this.line.getMbr();
			this.rect.borderColor = SELECTION_COLOR;
			this.rect.backgroundColor = SELECTION_BACKGROUND;
			this.board.tools.publish();
			return false;
		}

		this.isDownOnUnselectedItem = hover.length !== 0;
		this.isDraggingUnselectedItem = this.isDownOnUnselectedItem;
		if (this.isDownOnUnselectedItem) {
			const selected = this.board.selection.items.getSingle();
			if (selected === hover[hover.length - 1]) {
				return false;
			}
			this.downOnItem = hover[hover.length - 1];
			// цепляться за якори в коннекторе когда коннектор еще не выделен
			// TODO API Dirty Check
			if (this.downOnItem.itemType === "Connector") {
				this.board.selection.editUnderPointer();
				this.board.tools.publish();
				this.clear();
				return this.board.selection.tool.getTool().leftButtonDown();
			}
			return false;
		}
		return false;
	}

	rightButtonDown(): boolean {
		if (this.isLeftDown || this.isMiddleDown) {
			return false;
		}
		this.clear();
		this.isRightDown = true;
		const { items, selection, pointer } = this.board;

		const selectionMbr = selection.getMbr();
		this.isDownOnSelection =
			selectionMbr !== undefined &&
			selectionMbr.isUnderPoint(pointer.point);
		if (this.isDownOnSelection) {
			return false;
		}

		const hover = items.getUnderPointer();
		this.isDownOnBoard = hover.length === 0;
		this.isDraggingBoard = this.isDownOnBoard;
		if (this.isDraggingBoard) {
			return false;
		}

		this.isDownOnUnselectedItem = hover.length !== 0;
		this.isDraggingUnselectedItem = this.isDownOnUnselectedItem;
		if (this.isDraggingUnselectedItem) {
			this.downOnItem = hover[hover.length - 1];
			return false;
		}
		return false;
	}

	middleButtonDown(): boolean {
		if (this.isLeftDown || this.isRightDown) {
			return false;
		}
		this.clear();
		this.isMiddleDown = true;
		this.isDraggingBoard = true;
		return false;
	}

	pointerMoveBy(x: number, y: number): boolean {
		const throttleTime = 10;
		const timeDiff =
			this.lastPointerMoveEventTime + throttleTime - Date.now();

		if (timeDiff > 0) {
			this.isMovedAfterDown = false;
		} else {
			this.isMovedAfterDown =
				this.isLeftDown || this.isRightDown || this.isMiddleDown;
		}
		if (this.isDraggingBoard) {
			this.board.camera.translateBy(x, y);
			return false;
		}
		if (this.isDraggingSelection) {
			this.board.selection.translateBy(x, y);
			return false;
		}
		if (
			this.isDraggingUnselectedItem &&
			this.downOnItem &&
			this.downOnItem.itemType !== "Connector"
		) {
			// translate item without selection
			this.downOnItem.transformation.translateBy(x, y);
			return false;
		}
		if (this.isDrawingRectangle && this.line && this.rect) {
			const point = this.board.pointer.point.copy();
			this.line = new Line(this.line.start, point);
			this.rect = this.line.getMbr();
			this.rect.borderColor = SELECTION_COLOR;
			this.rect.backgroundColor = SELECTION_BACKGROUND;
			this.board.tools.publish();
			return false;
		}
		return false;
	}

	leftButtonUp(): boolean {
		if (!this.isLeftDown) {
			return false;
		}
		if (!this.isMovedAfterDown) {
			const { isCtrl, isShift } = this.board.keyboard;
			if (isCtrl || isShift) {
				const underPointer = this.board.items.getUnderPointer()[0];
				const isEmptySelection =
					this.board.selection.items.list().length === 0;
				if (!underPointer && !isEmptySelection && isShift) {
					this.board.selection.add(this.board.selection.items.list());
					this.clear();
					this.board.tools.publish();
					return false;
				}
				if (!underPointer) {
					this.board.selection.editUnderPointer();
					this.clear();
					return false;
				}
				const isNotInSelection =
					this.board.selection.items.findById(
						underPointer.getId(),
					) === null;
				if (isNotInSelection) {
					this.board.selection.add(underPointer);
				} else {
					this.board.selection.remove(underPointer);
				}
				this.clear();
				this.board.tools.publish();
				return false;
			} else {
				this.board.selection.editUnderPointer();
				this.board.tools.publish();
				this.clear();
				return false;
			}
		}
		if (this.isDraggingUnselectedItem && this.downOnItem) {
			this.board.selection.removeAll();
			this.clear();
			this.board.tools.publish();
			return false;
		}
		if (this.isDrawingRectangle && this.line && this.rect) {
			const isAddToSelection = this.board.keyboard.down === "Shift";
			if (isAddToSelection) {
				const { left, top, right, bottom } = this.rect;
				const items = this.board.items.getEnclosedOrCrossed(
					left,
					top,
					right,
					bottom,
				);
				this.board.selection.add(items);
			} else {
				this.board.selection.selectEnclosedOrCrossedBy(this.rect);
			}
			this.board.tools.publish();
			this.clear();
			return false;
		}
		// this.board.selection.removeAll();
		this.clear();
		this.board.tools.publish();
		return false;
	}

	rightButtonUp(): boolean {
		if (!this.isRightDown) {
			return false;
		}
		if (!this.isMovedAfterDown) {
			this.board.selection.editUnderPointer();
			this.clear();
			return false;
		}
		if (
			this.isDraggingUnselectedItem &&
			this.downOnItem &&
			this.downOnItem.itemType !== "Connector"
		) {
			this.board.selection.removeAll();
			this.clear();
			return false;
		}
		this.board.selection.removeAll();
		this.clear();
		this.board.tools.publish();
		return false;
	}

	middleButtonUp(): boolean {
		if (!this.isMiddleDown) {
			return false;
		}
		this.clear();
		return false;
	}

	leftButtonDouble(): boolean {
		this.board.selection.editTextUnderPointer();
		this.board.selection.editText();
		return false;
	}

	render(context: DrawingContext): void {
		if (this.isDrawingRectangle && this.rect) {
			this.rect.render(context);
		}
	}
}
