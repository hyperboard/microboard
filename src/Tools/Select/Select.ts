import { Board } from "../../Board";
import { Frame, Item, Line, Mbr, Point } from "../../Items";
import { DrawingContext } from "../../Items/DrawingContext";
import { Tool } from "../Tool";
import { SELECTION_BACKGROUND, SELECTION_COLOR } from "View/Tools/Selection";
import { NestingHighlighter } from "../NestingHighlighter";
import createCanvasDrawer, { CanvasDrawer } from "../../drawMbrOnCanvas.js";
import { createDebounceUpdater } from "../DebounceUpdater";
import { quickAddItem } from "Board/Selection/QuickAddButtons";
import { isSafari } from "App/isSafari";
import AlignmentHelper from "../RelativeAlignment";
import { Group } from "Board/Items/Group/Group.js";
import { Comment } from "Board/Items/Comment/Comment";
import { Selection } from "Board/Selection/index.js";
import { RELATIVE_ALIGNMENT_COLOR } from "../RelativeAlignment/RelativeAlignment.js";

export class Select extends Tool {
	line: null | Line = null;
	rect: null | Mbr = null;
	downOnItem: null | Item = null;

	isHoverUnselectedItem = false;
	isDrawingRectangle = false;
	isCameraPan = false;
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
	nestingHighlighter = new NestingHighlighter();
	beginTimeStamp = Date.now();
	canvasDrawer: CanvasDrawer;
	debounceUpd = createDebounceUpdater();

	private alignmentHelper: AlignmentHelper;
	private snapLines: { verticalLines: Line[]; horizontalLines: Line[] } = {
		verticalLines: [],
		horizontalLines: [],
	};
	private isSnapped: boolean | undefined = false;
	private snapCursorPos: Point | null = null;
	private originalCenter: Point | null = null;
	private initialCursorPos: Point | null = null;
	private guidelines: Line[] = [];
	private mainLine: Line | null = null;
	private snapLine: Line | null = null;

	constructor(private board: Board) {
		super();
		this.canvasDrawer = createCanvasDrawer(board);
		this.alignmentHelper = new AlignmentHelper(
			board,
			board.index,
			this.canvasDrawer,
		);
	}

	clear(): void {
		if (this.isDraggingSelection || this.isDraggingUnselectedItem) {
			this.board.selection.nestSelectedItems(this.downOnItem, false);
		}
		this.isDrawingRectangle = false;
		this.isCameraPan = false;
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
		this.beginTimeStamp = Date.now();
		this.nestingHighlighter.clear();
		this.canvasDrawer.clearCanvasAndKeys();
		this.debounceUpd.setFalse();
		this.snapLines = { verticalLines: [], horizontalLines: [] };
	}

	private handleSnapping(item: Item): boolean {
		if (this.board.keyboard.isShift) {
			return false;
		}
		const increasedSnapThreshold = 5;

		this.isSnapped = this.alignmentHelper.snapToClosestLine(
			item,
			this.snapLines,
			this.beginTimeStamp,
			this.board.pointer.point,
		);

		if (this.isSnapped) {
			if (!this.snapCursorPos) {
				this.snapCursorPos = new Point(
					this.board.pointer.point.x,
					this.board.pointer.point.y,
				);
			}

			const cursorDiffX = Math.abs(
				this.board.pointer.point.x - this.snapCursorPos.x,
			);
			const cursorDiffY = Math.abs(
				this.board.pointer.point.y - this.snapCursorPos.y,
			);

			if (
				(cursorDiffX > increasedSnapThreshold ||
					cursorDiffY > increasedSnapThreshold) &&
				this.initialCursorPos
			) {
				this.isSnapped = false;
				this.snapCursorPos = null;
				const itemCenter = item.getMbr().getCenter();
				const targetX =
					this.board.pointer.point.x - this.initialCursorPos.x;
				const targetY =
					this.board.pointer.point.y - this.initialCursorPos.y;
				const translateX = targetX - itemCenter.x;
				const translateY = targetY - itemCenter.y;
				this.alignmentHelper.translateItemsOrCanvas(
					item,
					translateX,
					translateY,
					this.beginTimeStamp,
				);
			}
		}
		return false;
	}

	private calculateLineLength(line: Line, center: Point): number {
		const dx = line.end.x - line.start.x;
		const dy = line.end.y - line.start.y;
		const length = Math.sqrt(dx * dx + dy * dy);

		const directionX = line.end.x - center.x;
		const directionY = line.end.y - center.y;

		const dotProduct = dx * directionX + dy * directionY;

		return dotProduct >= 0 ? length : -length;
	}

	private calculateAngle(line1: Line, line2: Line): number {
		const dx1 = line1.end.x - line1.start.x;
		const dy1 = line1.end.y - line1.start.y;
		const dx2 = line2.end.x - line2.start.x;
		const dy2 = line2.end.y - line2.start.y;

		const angle1 = Math.atan2(dy1, dx1);
		const angle2 = Math.atan2(dy2, dx2);
		let angleDiff = (angle2 - angle1) * (180 / Math.PI);

		angleDiff = angleDiff < 0 ? angleDiff + 360 : angleDiff;
		return Math.min(angleDiff, 360 - angleDiff);
	}

	private handleShiftGuidelines(item: Item, mousePosition: Point): void {
		if (item) {
			if (!this.originalCenter) {
				this.originalCenter = item.getMbr().getCenter().copy();
				this.guidelines = this.alignmentHelper.generateGuidelines(
					this.originalCenter,
				).lines;
			}
			this.mainLine = new Line(this.originalCenter, mousePosition);
			let minAngle = Infinity;
			let newSnapLine: Line | null = null;

			this.guidelines.forEach(guideline => {
				const angle = this.calculateAngle(this.mainLine!, guideline);
				if (angle < minAngle) {
					minAngle = angle;
					newSnapLine = guideline;
				}
			});

			if (newSnapLine) {
				this.snapLine = newSnapLine as Line;
				const mainLineLength = this.calculateLineLength(
					this.mainLine,
					this.originalCenter!,
				);

				const snapDirectionX =
					(this.snapLine.end.x - this.snapLine.start.x) /
					this.calculateLineLength(
						this.snapLine,
						this.originalCenter!,
					);
				const snapDirectionY =
					(this.snapLine.end.y - this.snapLine.start.y) /
					this.calculateLineLength(
						this.snapLine,
						this.originalCenter!,
					);

				const newEndX =
					this.originalCenter.x + snapDirectionX * mainLineLength;
				const newEndY =
					this.originalCenter.y + snapDirectionY * mainLineLength;

				const threshold = Infinity; // Убрали ограничение
				const translateX = newEndX - item.getMbr().getCenter().x;
				const translateY = newEndY - item.getMbr().getCenter().y;
				item.transformation.translateBy(
					translateX,
					translateY,
					this.beginTimeStamp,
				);
			}
		}
	}

	private clearGuidelines(): void {
		this.originalCenter = null;
		this.guidelines = [];
		this.mainLine = null;
		this.snapLine = null;
	}

	leftButtonDown(hoveredItem?: Item): boolean {
		if (this.isRightDown || this.isMiddleDown) {
			return false;
		}
		this.clear();
		this.isLeftDown = true;
		const { items, selection, pointer } = this.board;
		selection.showQuickAddPanel = false;
		const hover = [
			...items
				.getUnderPointer()
				.filter(i => i.getId() !== hoveredItem?.getId()),
		];
		if (hoveredItem) {
			hover.push(hoveredItem);
		}

		const isHoverAiInput =
			hover.length === 1 && hover[0].itemType === "AINode";
		const isLocked = this.board.selection.getIsLockedSelection();

		if (isLocked && !(isHoverAiInput && !!this.board.aiGeneratingOnItem)) {
			return false;
		}

		this.beginTimeStamp = Date.now();

		const selectionMbr = selection.getMbr();
		const selectionItems = selection.list();
		this.isDownOnSelection =
			selectionMbr !== undefined &&
			selectionMbr.isUnderPoint(pointer.point) &&
			hover.every(hovered =>
				selectionItems.some(
					selected => selected.getId() === hovered.getId(),
				),
			);

		this.isDraggingSelection = this.isDownOnSelection;
		if (this.isDraggingSelection) {
			this.board.selection.transformationRenderBlock = true;
			if (!this.initialCursorPos) {
				const itemCenter = selectionItems[0].getMbr().getCenter();
				this.initialCursorPos = new Point(
					this.board.pointer.point.x - itemCenter.x,
					this.board.pointer.point.y - itemCenter.y,
				);
			}
			this.board.selection.quickAddButtons.clear();
			return false;
		}

		this.isDownOnBoard = hover.length === 0;
		this.isDrawingRectangle =
			hover.filter(item => !(item instanceof Frame)).length === 0 &&
			hover
				.filter((item): item is Frame => item instanceof Frame)
				.filter(frame => frame.isTextUnderPoint(pointer.point))
				.length === 0;

		if (this.isDrawingRectangle) {
			const { x, y } = pointer.point;
			this.line = new Line(new Point(x, y), new Point(x, y));
			this.rect = this.line.getMbr();
			this.rect.borderColor = SELECTION_COLOR;
			this.rect.backgroundColor = SELECTION_BACKGROUND;
			this.board.tools.publish();

			this.board.presence.throttledEmit({
				method: "DrawSelect",
				timestamp: Date.now(),
				size: {
					left: this.rect.left,
					top: this.rect.top,
					right: this.rect.right,
					bottom: this.rect.bottom,
				},
			});

			return false;
		}

		const isHoverLocked = hover.every(item => item.transformation.isLocked);
		if (isHoverLocked) {
			return false;
		}

		this.board.presence.throttledEmit({
			method: "CancelDrawSelect",
			timestamp: Date.now(),
		});

		this.isDownOnUnselectedItem = hover.length !== 0;
		this.isDraggingUnselectedItem = this.isDownOnUnselectedItem;
		if (this.isDownOnUnselectedItem) {
			const selected = this.board.selection.items.getSingle();
			if (selected === hover[hover.length - 1]) {
				return false;
			}
			this.downOnItem = hover[hover.length - 1];

			if (
				this.downOnItem &&
				!this.initialCursorPos &&
				this.downOnItem.itemType !== "Comment"
			) {
				const itemCenter = this.downOnItem.getMbr().getCenter();
				this.initialCursorPos = new Point(
					this.board.pointer.point.x - itemCenter.x,
					this.board.pointer.point.y - itemCenter.y,
				);
			}

			// цепляться за якори в коннекторе когда коннектор еще не выделен
			if (
				this.downOnItem.itemType === "Connector" &&
				this.downOnItem.isConnectedOnePoint() &&
				!this.board.keyboard.isCtrl
			) {
				this.board.selection.editUnderPointer();
				this.board.tools.publish();
				this.clear();
				return this.board.selection.tool.leftButtonDown();
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
		this.isCameraPan = this.isDownOnBoard;
		if (this.isCameraPan) {
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
		this.isCameraPan = true;
		return false;
	}

	pointerMoveBy(x: number, y: number): boolean {
		const isDrawingSelectionMbr =
			this.isDrawingRectangle && this.line && this.rect;
		if (isDrawingSelectionMbr) {
			const point = this.board.pointer.point.copy();
			this.line = new Line(this.line.start, point);
			this.rect = this.line.getMbr();
			this.rect.borderColor = SELECTION_COLOR;
			this.rect.backgroundColor = SELECTION_BACKGROUND;
			this.board.tools.publish();

			this.board.presence.throttledEmit({
				method: "DrawSelect",
				timestamp: Date.now(),
				size: {
					left: this.rect.left,
					top: this.rect.top,
					right: this.rect.right,
					bottom: this.rect.bottom,
				},
			});
			return false;
		}

		if (this.board.getInterfaceType() !== "edit") {
			return false;
		}
		const { selection, items } = this.board;

		this.updateMovementFlag();

		if (this.isCameraPan) {
			this.board.camera.translateBy(x, y);
			return false;
		}

		this.updateGuidelines();

		this.updateSnapLines();

		if (this.downOnItem?.itemType === "Comment") {
			const topItem = this.board.items.getUnderPointer().pop();
			this.nestingHighlighter.clear();
			if (topItem) {
				this.nestingHighlighter.addSingleItem(topItem);
			}
		}

		if (this.isDraggingSelection) {
			const selectionMbr = selection.getMbr();
			const single = selection.items.getSingle();
			if (single) {
				if (this.handleSnapping(single)) {
					return false;
				}
			}

			// TODO: fix error case when not selected items are translated with selection
			const isCanvasOk =
				this.canvasDrawer.getLastCreatedCanvas() &&
				!this.debounceUpd.shouldUpd();

			const isCanvasNeedsUpdate =
				this.canvasDrawer.getLastCreatedCanvas() &&
				this.debounceUpd.shouldUpd();

			if (isCanvasOk) {
				this.canvasDrawer.translateCanvasBy(x, y);
				this.canvasDrawer.highlightNesting();
				return false;
			} else if (isCanvasNeedsUpdate) {
				this.canvasDrawer.translateCanvasBy(x, y);
				const { translateX, translateY } =
					this.canvasDrawer.getMatrix();
				const translation = selection.getManyItemsTranslation(
					translateX,
					translateY,
				);
				this.canvasDrawer.highlightNesting();
				selection.transformMany(translation, this.beginTimeStamp);
				this.canvasDrawer.clearCanvasAndKeys();
				this.debounceUpd.setFalse();
				return false;
			} else {
				const translation = selection.getManyItemsTranslation(x, y);

				const translationKeys = Object.keys(translation);
				const commentsSet = new Set(
					this.board.items
						.getComments()
						.map(comment => comment.getId()),
				);

				if (
					translationKeys.filter(item => !commentsSet.has(item))
						.length > 10
				) {
					const selectedMbr = this.board.selection.getMbr()?.copy();
					const sumMbr = this.canvasDrawer.countSumMbr(translation);
					if (sumMbr) {
						this.canvasDrawer.updateCanvasAndKeys(
							sumMbr,
							translation,
							undefined,
							selectedMbr,
						);
						this.canvasDrawer.translateCanvasBy(x, y);
						this.canvasDrawer.highlightNesting();
						this.debounceUpd.setFalse();
						this.debounceUpd.setTimeoutUpdate(1000);
						return false;
					}
				} else {
					selection.transformMany(translation, this.beginTimeStamp);
				}
			}

			this.updateFramesNesting(selectionMbr, selection);

			return false;
		}

		if (this.isDraggingUnselectedItem && this.downOnItem) {
			// translate item without selection
			const { downOnItem: draggingItem } = this;
			const translation = this.board.selection.getManyItemsTranslation(
				x,
				y,
				draggingItem,
			);
			this.board.selection.transformMany(
				translation,
				this.beginTimeStamp,
			);

			if (this.handleSnapping(this.downOnItem)) {
				return false;
			}

			const draggingMbr = draggingItem.getMbr();
			const frames = this.board.items
				.getEnclosedOrCrossed(
					draggingMbr.left,
					draggingMbr.top,
					draggingMbr.right,
					draggingMbr.bottom,
				)
				.filter((item): item is Frame => item instanceof Frame);
			frames.forEach(frame => {
				if (frame.handleNesting(draggingItem)) {
					this.nestingHighlighter.add(frame, draggingItem);
				} else {
					this.nestingHighlighter.remove(draggingItem);
				}
			});
		}

		const hover = items.getUnderPointer();
		this.isHoverUnselectedItem =
			hover.filter(item => item.itemType === "Placeholder").length === 1;

		if (
			this.isHoverUnselectedItem &&
			!this.isDraggingUnselectedItem &&
			selection.getContext() === "None"
		) {
			selection.setContext("HoverUnderPointer");
			return false;
		}

		if (
			(!this.isHoverUnselectedItem || this.isDraggingUnselectedItem) &&
			selection.getContext() === "HoverUnderPointer"
		) {
			selection.setContext("None");
			return false;
		}

		this.board.presence.throttledEmit({
			method: "CancelDrawSelect",
			timestamp: Date.now(),
		});

		return false;
	}

	private updateMovementFlag(): void {
		const throttleTime = 10;
		const timeDiff =
			this.lastPointerMoveEventTime + throttleTime - Date.now();

		if (timeDiff > 0) {
			this.isMovedAfterDown = false;
		} else {
			this.isMovedAfterDown =
				this.isLeftDown || this.isRightDown || this.isMiddleDown;
		}
	}

	private updateGuidelines(): void {
		const { isShift } = this.board.keyboard;

		if (isShift) {
			const mousePosition = this.board.pointer.point;
			if (this.downOnItem) {
				this.handleShiftGuidelines(this.downOnItem, mousePosition);
			} else if (this.isDraggingSelection) {
				const singleItem = this.board.selection.items.getSingle();
				if (singleItem) {
					this.handleShiftGuidelines(singleItem, mousePosition);
				}
			}
		} else {
			this.clearGuidelines();
		}
	}

	private updateFramesNesting(
		selectionMbr: Mbr | undefined,
		selection: Selection,
	): void {
		const frames = this.board.items
			.getEnclosedOrCrossed(
				selectionMbr!.left,
				selectionMbr!.top,
				selectionMbr!.right,
				selectionMbr!.bottom,
			)
			.filter((item): item is Frame => item instanceof Frame)
			.filter(frame => !selection.items.list().includes(frame));
		const draggingFramesIds = selection
			.list()
			.filter(item => item instanceof Frame)
			.map(frame => frame.getId());
		selection.list().forEach(item => {
			if (
				!(item instanceof Frame) &&
				!draggingFramesIds.includes(item.parent)
			) {
				frames.forEach(frame => {
					if (frame.handleNesting(item)) {
						this.nestingHighlighter.add(frame, item);
					} else {
						this.nestingHighlighter.remove(item);
					}
				});
			}
		});
	}

	private updateSnapLines(): void {
		const alignmentItem = this.getAlignmentItem();

		if (alignmentItem) {
			this.snapLines = this.alignmentHelper.checkAlignment(alignmentItem);
		} else {
			this.snapLines = { verticalLines: [], horizontalLines: [] };
		}
	}

	private getAlignmentItem(): Item | null {
		let finalItem: Item | null = null;

		const singleItem = this.board.selection.items.getSingle();
		const groupItem = this.board.selection.items;

		const isConnectorUnderPointer =
			this.downOnItem?.itemType !== "Connector";
		const isDraggingSingleSelectedItem =
			this.isDraggingSelection && singleItem;
		// const isDregginGroupSelectedItem =
		// 	this.isDraggingSelection && groupItem;

		if (isConnectorUnderPointer) {
			finalItem = this.downOnItem;
		}
		if (isDraggingSingleSelectedItem) {
			finalItem = singleItem;
		}
		return finalItem;
	}

	leftButtonUp(): boolean {
		if (!this.isLeftDown) {
			return false;
		}

		this.initialCursorPos = null;

		if (
			this.isDrawingRectangle &&
			this.line &&
			this.rect &&
			this.rect.getHeight() &&
			this.rect.getWidth()
		) {
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
		if (this.board.getInterfaceType() !== "edit") {
			return false;
		}

		const topItem = this.board.items.getUnderPointer().pop();
		const curr = this.downOnItem;
		if (curr instanceof Comment && topItem) {
			curr.setItemToFollow(topItem.getId());
		}

		if (
			curr &&
			curr.itemType == "AINode" &&
			this.board.aiGeneratingOnItem
		) {
			this.board.tools.publish();
			this.clear();
			return false;
		}

		if (!this.isMovedAfterDown) {
			const { isCtrl, isShift } = this.board.keyboard;
			const hovered = this.board.items.getUnderPointer();
			this.board.pointer.subject.publish(this.board.pointer);

			if (isCtrl || isShift) {
				const underPointer = hovered[0];
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
					if (underPointer.itemType === "Frame") {
						const { left, right, top, bottom } =
							underPointer.getMbr();
						const itemsInFrame = this.board.items
							.getEnclosedOrCrossed(left, top, right, bottom)
							.filter(item =>
								underPointer
									.getChildrenIds()
									.includes(item.getId()),
							);
						this.board.selection.add(itemsInFrame);
					}
					this.board.selection.setContext("EditUnderPointer");
				} else {
					this.board.selection.remove(underPointer);
				}
				this.clear();
				this.board.tools.publish();
				return false;
			} else {
				const topItem = hovered.pop();
				const curr = this.board.selection.items.getSingle();

				if (
					this.board.selection.getContext() === "EditUnderPointer" &&
					curr &&
					topItem === curr &&
					!this.board.selection.getIsLockedSelection()
				) {
					curr
						.getRichText()
						?.saveLastClickPoint(
							this.board.pointer.point.copy(),
							this.board.camera,
						);
					this.board.selection.editText();
				} else {
					this.board.selection.editUnderPointer();
				}

				if (topItem instanceof Group) {
					const groupChildren = topItem.getChildren();
					this.board.selection.add(groupChildren);
				}

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

			// this.board.presence.throttledEmit({
			// 	method: "DrawSelect",
			// 	timestamp: Date.now(),
			// 	size: {
			// 		left: this.rect.left,
			// 		top: this.rect.top,
			// 		right: this.rect.right,
			// 		bottom: this.rect.bottom,
			// 	},
			// });

			this.board.presence.emit({
				method: "CancelDrawSelect",
				timestamp: Date.now(),
			});

			return false;
		}
		this.board.presence.emit({
			method: "CancelDrawSelect",
			timestamp: Date.now(),
		});
		// this.board.selection.removeAll();
		if (this.canvasDrawer.getLastCreatedCanvas()) {
			const translation = this.board.selection.getManyItemsTranslation(
				this.canvasDrawer.getMatrix().translateX,
				this.canvasDrawer.getMatrix().translateY,
			);
			this.board.selection.transformMany(
				translation,
				this.beginTimeStamp,
			);
		}

		if (this.isMovedAfterDown && this.downOnItem) {
			this.originalCenter = this.downOnItem.getMbr().getCenter();
		}
		this.clear();
		this.clearGuidelines();
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
		if (this.board.getInterfaceType() !== "edit") {
			return false;
		}
		const toEdit = this.board.selection.items.getSingle();
		if (
			toEdit?.transformation.isLocked ||
			(toEdit?.itemType === "AINode" && !!this.board.aiGeneratingOnItem)
		) {
			return false;
		}

		this.board.selection.editTextUnderPointer();

		if (this.board.selection.getIsLockedSelection()) {
			return false;
		}

		toEdit
			?.getRichText()
			?.saveLastClickPoint(
				this.board.pointer.point.copy(),
				this.board.camera,
			);
		this.board.selection.editText();
		return false;
	}

	onCancel(): void {
		if (this.board.selection.showQuickAddPanel) {
			this.board.selection.showQuickAddPanel = false;
			this.board.selection.subject.publish(this.board.selection);
		} else if (
			this.board.selection.getContext() === "EditTextUnderPointer"
		) {
			this.board.selection.setContext("EditUnderPointer");
		} else if (this.board.selection.items.list().length > 0) {
			this.board.selection.removeAll();
		}
	}

	onConfirm(): void {
		const single = this.board.selection.items.getSingle();
		if (
			this.board.selection.showQuickAddPanel &&
			single &&
			single.itemType === "Connector"
		) {
			quickAddItem(this.board, "copy", single);
		} else if (
			single &&
			this.board.selection.getContext() !== "EditTextUnderPointer" &&
			!this.board.selection.getIsLockedSelection()
		) {
			this.board.selection.editText(undefined, true);
		} else if (
			isSafari() &&
			this.board.selection.getContext() === "EditTextUnderPointer" &&
			!this.board.selection.getIsLockedSelection()
		) {
			if (
				(single && "text" in single) ||
				single?.itemType === "RichText"
			) {
				const text =
					single.itemType === "RichText" ? single : single.text;
				text.editor.splitNode();
			}
		}
	}

	render(context: DrawingContext): void {
		const { isShift } = this.board.keyboard;
		if (this.isDrawingRectangle && this.rect) {
			this.rect.strokeWidth = 1 / this.board.camera.getScale();
			this.rect.render(context);
		} else {
			this.nestingHighlighter.render(context);
		}

		this.alignmentHelper.renderSnapLines(
			context,
			this.snapLines,
			this.board.camera.getScale(),
		);

		if (this.snapLine && isShift) {
			context.ctx.save();
			context.ctx.strokeStyle = RELATIVE_ALIGNMENT_COLOR;
			context.ctx.lineWidth = 1 / this.board.camera.getScale();
			context.ctx.setLineDash([10, 5]);

			context.ctx.beginPath();
			context.ctx.moveTo(this.snapLine.start.x, this.snapLine.start.y);
			context.ctx.lineTo(this.snapLine.end.x, this.snapLine.end.y);
			context.ctx.stroke();

			context.ctx.restore();
		}
	}
}
