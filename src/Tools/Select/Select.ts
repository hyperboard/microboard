import { Board } from 'Board';
import createCanvasDrawer, { CanvasDrawer } from 'drawMbrOnCanvas';
import { Line, Mbr, Item, Point, Frame, Connector, RichText } from 'Items';
import { transformOps } from 'Geometry/Transformation/transformOps';
import { DrawingContext } from 'Geometry/DrawingContext';
import { quickAddItem } from 'Selection/QuickAddButtons';
import { conf } from 'Settings';
import { createDebounceUpdater } from 'Tools/DebounceUpdater';
import { NestingHighlighter } from 'Tools/NestingHighlighter';
import AlignmentHelper from 'Tools/RelativeAlignment';
import { RELATIVE_ALIGNMENT_COLOR } from 'Tools/RelativeAlignment/RelativeAlignment';
import { registerTool } from 'Items/RegisterItem';
import { BoardTool } from 'Tools/BoardTool';
import { isSafari } from 'isSafari';
import { BoardSelection } from '../../Selection';
import { BaseItem } from 'Items/BaseItem';

export class Select extends BoardTool {
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
	initialSnap = false;

	constructor(board: Board) {
		super(board);
		this.canvasDrawer = createCanvasDrawer(board);
		this.alignmentHelper = new AlignmentHelper(
			board,
			board.index,
			this.canvasDrawer,
			this.debounceUpd
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

	private getHoverItems(hoveredItem?: Item): Item[] {
		const hover = [
			...this.board.items.getUnderPointer().filter(item => item.getId() !== hoveredItem?.getId()),
		];
		if (hoveredItem) {
			hover.push(hoveredItem);
		}
		return hover;
	}

	private emitCancelDrawSelect(throttled = true): void {
		const emit = throttled ? this.board.presence.throttledEmit : this.board.presence.emit;
		emit.call(this.board.presence, {
			method: 'CancelDrawSelect',
			timestamp: Date.now(),
		});
	}

	private emitDrawSelect(): void {
		if (!this.rect) {
			return;
		}

		this.board.presence.throttledEmit({
			method: 'DrawSelect',
			timestamp: Date.now(),
			size: {
				left: this.rect.left,
				top: this.rect.top,
				right: this.rect.right,
				bottom: this.rect.bottom,
			},
		});
	}

	private startSelectionRectangle(): boolean {
		const { x, y } = this.board.pointer.point;
		this.line = new Line(new Point(x, y), new Point(x, y));
		this.rect = this.line.getMbr();
		this.rect.borderColor = conf.SELECTION_COLOR;
		this.rect.backgroundColor = conf.SELECTION_BACKGROUND;
		this.board.tools.publish();
		this.emitDrawSelect();
		return false;
	}

	private updateSelectionRectangle(): boolean {
		const point = this.board.pointer.point.copy();
		this.line = new Line(this.line!.start, point);
		this.rect = this.line.getMbr();
		this.rect.borderColor = conf.SELECTION_COLOR;
		this.rect.backgroundColor = conf.SELECTION_BACKGROUND;
		this.board.tools.publish();
		this.emitDrawSelect();
		return false;
	}

	private initializeSelectionDrag(selectionItems: Item[]): boolean {
		this.isDraggingSelection = true;
		this.board.selection.transformationRenderBlock = true;
		if (!this.initialCursorPos) {
			const itemCenter = this.alignmentHelper.combineMBRs(selectionItems).getCenter();
			this.initialCursorPos = new Point(
				this.board.pointer.point.x - itemCenter.x,
				this.board.pointer.point.y - itemCenter.y
			);
		}
		this.board.selection.quickAddButtons.clear();
		return false;
	}

	private isPointerDownOnSelection(hover: Item[]): boolean {
		const { selection, pointer } = this.board;
		const selectionMbr = selection.getMbr();
		const selectionItems = selection.list();
		const selectableHover = hover.map(item => this.board.selection.getSelectableItem(item));
		const isPointerInsideSelection = selectionMbr?.isUnderPoint(pointer.point) ?? false;
		const areAllHoveredItemsSelected = selectableHover.every(
			hovered =>
				hovered && selectionItems.some(selected => selected.getId() === hovered.getId())
		);

		return isPointerInsideSelection && areAllHoveredItemsSelected;
	}

	private shouldDrawSelectionRectangle(hover: Item[]): boolean {
		const frames = hover.filter((item): item is Frame => item instanceof Frame);
		const hasOnlyFramesUnderPointer = hover.every(item => item instanceof Frame);
		const isPointerOverAnyFrameText = frames.some(frame =>
			frame.text.isUnderPoint(this.board.pointer.point)
		);

		return hasOnlyFramesUnderPointer && !isPointerOverAnyFrameText;
	}

	private initializeUnselectedItemDrag(hover: Item[]): boolean {
		this.isDownOnUnselectedItem = hover.length !== 0;
		this.isDraggingUnselectedItem = this.isDownOnUnselectedItem;
		if (!this.isDownOnUnselectedItem) {
			return false;
		}

		const hoveredTarget = hover[hover.length - 1];
		const targetItem =
			this.board.selection.getSelectableItem(hoveredTarget) ?? hoveredTarget;
		const selected = this.board.selection.items.getSingle();
		if (selected === targetItem) {
			return false;
		}

		this.downOnItem = targetItem;
		this.initializeUnselectedItemCursorOffset();

		if (this.shouldEnterItemEditTool()) {
			this.board.selection.editUnderPointer();
			this.board.tools.publish();
			this.clear();
			return this.board.selection.tool.leftButtonDown();
		}

		return false;
	}

	private initializeUnselectedItemCursorOffset(): void {
		const dragTarget = this.downOnItem;
		const hasNoDragTarget = !dragTarget;
		const cursorOffsetAlreadyInitialized = !!this.initialCursorPos;
		const itemUsesFollowBehavior = dragTarget?.shouldFollowItems() ?? false;

		if (hasNoDragTarget || cursorOffsetAlreadyInitialized || itemUsesFollowBehavior) {
			return;
		}

		const itemCenter = dragTarget.getMbr().getCenter();
		this.initialCursorPos = new Point(
			this.board.pointer.point.x - itemCenter.x,
			this.board.pointer.point.y - itemCenter.y
		);
	}

	private shouldEnterItemEditTool(): boolean {
		const dragTarget = this.downOnItem;
		const hasDragTarget = !!dragTarget;
		const isConnectorAnchorHandle = hasDragTarget && !dragTarget.isAlignmentSource();
		const hasSingleConnectedPoint = hasDragTarget
			&& typeof (dragTarget as any).isConnectedOnePoint === "function"
			&& (dragTarget as any).isConnectedOnePoint();
		const isCtrlPressed = this.board.keyboard.isCtrl;

		return isConnectorAnchorHandle && hasSingleConnectedPoint && !isCtrlPressed;
	}

	private handleSelectionRectangleMove(): boolean {
		return this.updateSelectionRectangle();
	}

	private handleCameraPanMove(x: number, y: number): boolean {
		this.board.camera.translateBy(x, y);
		return false;
	}

	private highlightFollowItemTarget(): void {
		if (!this.downOnItem?.shouldFollowItems()) {
			return;
		}

		const topItem = this.board.items.getUnderPointer().pop();
		this.nestingHighlighter.clear();
		if (topItem) {
			this.nestingHighlighter.addSingleItem(topItem);
		}
	}

	private handleSelectionDragMove(x: number, y: number): boolean {
		const { selection } = this.board;
		const selectionMbr = selection.getMbr();
		const single = selection.items.getSingle();

		if (single && this.handleSnapping(single)) {
			return false;
		}

		if (this.handleCanvasSelectionDragMove(x, y, selection)) {
			return false;
		}

		if (this.handleDirectSelectionDragMove(x, y, selection)) {
			return false;
		}

		this.updateFramesNesting(selectionMbr, selection);
		return false;
	}

	private handleCanvasSelectionDragMove(x: number, y: number, selection: BoardSelection): boolean {
		const hasCanvas = !!this.canvasDrawer.getLastCreatedCanvas();
		if (!hasCanvas) {
			return false;
		}

		if (!this.debounceUpd.shouldUpd()) {
			this.canvasDrawer.translateCanvasBy(x, y);
			this.canvasDrawer.highlightNesting();
			return true;
		}

		this.canvasDrawer.translateCanvasBy(x, y);
		const { translateX, translateY } = this.canvasDrawer.getMatrix();
		const translation = selection.getManyItemsMove(translateX, translateY);
		this.canvasDrawer.highlightNesting();
		selection.moveMany(translation, this.beginTimeStamp);
		this.canvasDrawer.clearCanvasAndKeys();
		this.debounceUpd.setFalse();
		return true;
	}

	private handleDirectSelectionDragMove(x: number, y: number, selection: BoardSelection): boolean {
		if (this.handleSnapping(this.board.selection.items.list())) {
			return false;
		}

		const translation = selection.getManyItemsMove(x, y);
		const translationKeys = translation.map(item => item.id);
		const commentsSet = new Set(this.board.items.getComments().map(comment => comment.getId()));
		const movedNonCommentItemsCount = translationKeys.filter(item => !commentsSet.has(item)).length;

		if (movedNonCommentItemsCount > 10) {
			const selectedMbr = this.board.selection.getMbr()?.copy();
			const sumMbr = this.canvasDrawer.countSumMbr(translation);
			if (sumMbr) {
				this.canvasDrawer.updateCanvasAndKeys(sumMbr, translation, undefined, selectedMbr);
				this.canvasDrawer.translateCanvasBy(x, y);
				this.canvasDrawer.highlightNesting();
				this.debounceUpd.setFalse();
				this.debounceUpd.setTimeoutUpdate(1000);
				return true;
			}
		}

		selection.moveMany(translation, this.beginTimeStamp);
		return false;
	}

	private handleUnselectedItemDragMove(x: number, y: number): void {
		if (!this.isDraggingUnselectedItem || !this.downOnItem) {
			return;
		}

		const { downOnItem: draggingItem } = this;
		this.board.selection.removeAll();
		const translation = this.board.selection.getManyItemsMove(x, y, draggingItem);
		this.board.selection.moveMany(translation, this.beginTimeStamp);

		if (this.handleSnapping(this.downOnItem)) {
			return;
		}

		this.highlightDraggedItemNesting(draggingItem);
	}

	private highlightDraggedItemNesting(draggingItem: Item): void {
		const draggingMbr =
			draggingItem instanceof BaseItem && draggingItem.parent !== 'Board'
				? draggingItem.getWorldMbr()
				: draggingItem.getMbr();
		const groups: BaseItem[] = this.board.items
			.getEnclosedOrCrossed(
				draggingMbr.left,
				draggingMbr.top,
				draggingMbr.right,
				draggingMbr.bottom
			)
			.filter(item => !!('index' in item && item.index));

		groups.forEach(group => {
			const alreadyInGroup =
				draggingItem instanceof BaseItem && draggingItem.parent === group.getId();
			if (group.handleNesting(draggingItem) && !alreadyInGroup) {
				this.nestingHighlighter.add(group, draggingItem);
			} else {
				this.nestingHighlighter.remove(draggingItem);
			}
		});
	}

	private updateHoverContext(): boolean {
		const { selection, items } = this.board;
		const hover = items.getUnderPointer();
		this.isHoverUnselectedItem = hover.filter(item => !item.isReady()).length === 1;
		const isHoveringInteractiveItem = this.isHoverUnselectedItem && !this.isDraggingUnselectedItem;
		const isHoverContextActive = selection.getContext() === 'HoverUnderPointer';
		const shouldEnterHoverContext = isHoveringInteractiveItem && selection.getContext() === 'None';
		const shouldLeaveHoverContext =
			(!this.isHoverUnselectedItem || this.isDraggingUnselectedItem) && isHoverContextActive;

		if (shouldEnterHoverContext) {
			selection.setContext('HoverUnderPointer');
			return false;
		}

		if (shouldLeaveHoverContext) {
			selection.setContext('None');
			return false;
		}

		this.emitCancelDrawSelect();
		return false;
	}

	private hasSelectionRectangleArea(): boolean {
		const isDrawingSelectionRectangle = this.isDrawingRectangle && !!this.line && !!this.rect;
		const hasRectangleHeight = !!this.rect?.getHeight();
		const hasRectangleWidth = !!this.rect?.getWidth();

		return isDrawingSelectionRectangle && hasRectangleHeight && hasRectangleWidth;
	}

	private applySelectionRectangleSelection(): void {
		if (!this.rect) {
			return;
		}

		const isAddToSelection = this.board.keyboard.down === 'Shift';
		if (isAddToSelection) {
			const { left, top, right, bottom } = this.rect;
			const items = this.board.items.getEnclosedOrCrossed(left, top, right, bottom);
			this.board.selection.add(items);
		} else {
			this.board.selection.selectEnclosedOrCrossedBy(this.rect);
		}
	}

	private finishSelectionRectangleSelection(cancelWithPresenceEmit = false): boolean {
		this.applySelectionRectangleSelection();
		this.board.tools.publish();
		this.clear();
		if (cancelWithPresenceEmit) {
			this.board.presence.emit({
				method: 'CancelDrawSelect',
				timestamp: Date.now(),
			});
		}
		return false;
	}

	private finalizeDownItemInteraction(): boolean {
		const topItem = this.board.items.getUnderPointer().pop();
		const curr = this.downOnItem;
		if (curr) {
			curr.onSelectEnd(topItem);
		}

		if (curr && curr.isBusy()) {
			this.board.tools.publish();
			this.clear();
			return false;
		}

		return true;
	}

	private handleLeftClickSelection(): boolean {
		const { isCtrl, isShift } = this.board.keyboard;
		const hovered = this.board.items.getUnderPointer();
		this.board.pointer.subject.publish(this.board.pointer);

		if (isCtrl || isShift) {
			return this.handleModifiedLeftClick(hovered, isShift);
		}

		return this.handlePlainLeftClick(hovered);
	}

	private handleModifiedLeftClick(hovered: Item[], isShift: boolean): boolean {
		const underPointer = this.board.selection.getSelectableItem(hovered[0]);
		const isEmptySelection = this.board.selection.items.list().length === 0;
		const shouldKeepExistingSelection = !underPointer && !isEmptySelection && isShift;

		if (shouldKeepExistingSelection) {
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

		const isNotInSelection = this.board.selection.items.findById(underPointer.getId()) === null;
		if (isNotInSelection) {
			this.board.selection.add(underPointer);
			this.board.selection.setContext('EditUnderPointer');
		} else {
			this.board.selection.remove(underPointer);
		}

		this.clear();
		this.board.tools.publish();
		return false;
	}

	private handlePlainLeftClick(hovered: Item[]): boolean {
		const topItem = hovered.pop();
		const curr = this.board.selection.items.getSingle();
		const isEditUnderPointerContext = this.board.selection.getContext() === 'EditUnderPointer';
		const clickedSelectedItem = !!curr && topItem === curr;
		const canEditLockedSelection = !this.board.selection.getIsLockedSelection();
		const shouldEditText =
			isEditUnderPointerContext && clickedSelectedItem && canEditLockedSelection;

		if (shouldEditText) {
			curr.getRichText()?.saveLastClickPoint(this.board.pointer.point.copy(), this.board.camera);
			this.board.selection.editText();
		} else {
			this.board.selection.editUnderPointer();
		}

		this.board.tools.publish();
		this.clear();
		return false;
	}

	private finalizeCanvasSelectionDrag(): void {
		if (!this.canvasDrawer.getLastCreatedCanvas()) {
			return;
		}

		const translation = this.board.selection.getManyItemsMove(
			this.canvasDrawer.getMatrix().translateX,
			this.canvasDrawer.getMatrix().translateY
		);
		this.board.selection.moveMany(translation, this.beginTimeStamp);
	}

	private finishLeftDrag(): boolean {
		this.emitCancelDrawSelect(false);
		this.finalizeCanvasSelectionDrag();

		if (this.isMovedAfterDown && this.downOnItem) {
			this.originalCenter = this.downOnItem.getMbr().getCenter();
		}

		this.clear();
		this.clearGuidelines();
		this.board.tools.publish();
		return false;
	}

	private handleSnapping(item: Item | Item[]): boolean {
		if (this.board.keyboard.isShift) {
			return false;
		}
		const increasedSnapThreshold = Array.isArray(item) ? 40 : 35;

		this.isSnapped = this.alignmentHelper.snapToClosestLine(
			item,
			this.snapLines,
			this.beginTimeStamp,
			this.board.pointer.point
		);

		if (this.isSnapped) {
			if (!this.snapCursorPos) {
				this.snapCursorPos = new Point(this.board.pointer.point.x, this.board.pointer.point.y);
			}

			const cursorDiffX = Math.abs(this.board.pointer.point.x - this.snapCursorPos.x);
			const cursorDiffY = Math.abs(this.board.pointer.point.y - this.snapCursorPos.y);
			const hasMovedBeyondSnapThreshold =
				cursorDiffX > increasedSnapThreshold || cursorDiffY > increasedSnapThreshold;
			const canReleaseSnap = hasMovedBeyondSnapThreshold && !!this.initialCursorPos;

			if (canReleaseSnap) {
				const initialCursorPos = this.initialCursorPos!;
				this.isSnapped = false;
				this.snapCursorPos = null;
				const itemCenter = Array.isArray(item)
					? this.alignmentHelper.combineMBRs(item).getCenter()
					: item.getMbr().getCenter();
				const translateX = this.board.pointer.point.x - initialCursorPos.x - itemCenter.x;
				const translateY = this.board.pointer.point.y - initialCursorPos.y - itemCenter.y;
				this.alignmentHelper.translateItems(item, translateX, translateY, this.beginTimeStamp);
			}
		}
		return false;
	}

	private handleCanvasSnapping(): boolean {
		if (this.board.keyboard.isShift) {
			return false;
		}
		const increasedSnapThreshold = 5;

		this.isSnapped = this.alignmentHelper.snapCanvasToClosestLine(
			this.snapLines,
			this.beginTimeStamp,
			this.board.pointer.point
		);
		if (this.isSnapped) {
			if (!this.snapCursorPos) {
				this.snapCursorPos = new Point(this.board.pointer.point.x, this.board.pointer.point.y);
			}

			const cursorDiffX = Math.abs(this.board.pointer.point.x - this.snapCursorPos.x);
			const cursorDiffY = Math.abs(this.board.pointer.point.y - this.snapCursorPos.y);
			const hasMovedBeyondSnapThreshold =
				cursorDiffX > increasedSnapThreshold || cursorDiffY > increasedSnapThreshold;
			const canReleaseSnap = hasMovedBeyondSnapThreshold && !!this.initialCursorPos;

			if (canReleaseSnap) {
				const initialCursorPos = this.initialCursorPos!;
				this.isSnapped = false;
				this.snapCursorPos = null;
				const itemCenter = this.canvasDrawer.getMbr().getCenter();
				const targetX = this.board.pointer.point.x - initialCursorPos.x;
				const targetY = this.board.pointer.point.y - initialCursorPos.y;
				const translateX = targetX - (itemCenter.x - initialCursorPos.x);
				const translateY = targetY - (itemCenter.y - initialCursorPos.y);
				this.alignmentHelper.translateCanvas(translateX, translateY, this.beginTimeStamp);
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

	private handleShiftGuidelines(item: Item | Item[], mousePosition: Point): void {
		if (item) {
			if (!this.originalCenter) {
				this.originalCenter = Array.isArray(item)
					? this.board.selection.getMbr()?.getCenter().copy()!
					: item.getMbr().getCenter().copy();
				this.guidelines = this.alignmentHelper.generateGuidelines(this.originalCenter).lines;
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
				const mainLineLength = this.calculateLineLength(this.mainLine, this.originalCenter!);

				const snapDirectionX =
					(this.snapLine.end.x - this.snapLine.start.x) /
					this.calculateLineLength(this.snapLine, this.originalCenter!);
				const snapDirectionY =
					(this.snapLine.end.y - this.snapLine.start.y) /
					this.calculateLineLength(this.snapLine, this.originalCenter!);

				const newEndX = this.originalCenter.x + snapDirectionX * mainLineLength;
				const newEndY = this.originalCenter.y + snapDirectionY * mainLineLength;

				const translateX =
					newEndX -
					(Array.isArray(item)
						? this.board.selection.getMbr()?.getCenter().x!
						: item.getMbr().getCenter().x);
				const translateY =
					newEndY -
					(Array.isArray(item)
						? this.board.selection.getMbr()?.getCenter().y!
						: item.getMbr().getCenter().y);

				if (Array.isArray(item)) {
					const translation = this.board.selection.getManyItemsMove(translateX, translateY);
					this.board.selection.moveMany(translation, this.beginTimeStamp);
				} else {
					const worldMatrix = (item as BaseItem).getWorldMatrix();
					const newWorld = worldMatrix.copy();
					newWorld.translateX += translateX;
					newWorld.translateY += translateY;
					item.apply(transformOps.move([{
						id: item.getId(),
						worldMatrix: newWorld.getMatrixData(),
						prevWorldMatrix: worldMatrix.getMatrixData(),
					}], this.beginTimeStamp));
				}
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
		const { selection } = this.board;
		selection.showQuickAddPanel = false;
		const hover = this.getHoverItems(hoveredItem);
		const isLocked = this.board.selection.getIsLockedSelection();
		const canInteractWhileLocked = hover[0]?.canBeInteractedWithWhileLocked(
			!!this.board.aiGeneratingOnItem
		);
		const shouldBlockLockedInteraction = isLocked && !canInteractWhileLocked;

		if (shouldBlockLockedInteraction) {
			return false;
		}

		this.beginTimeStamp = Date.now();

		const selectionItems = selection.list();
		this.isDownOnSelection = this.isPointerDownOnSelection(hover);

		if (this.isDownOnSelection) {
			return this.initializeSelectionDrag(selectionItems);
		}

		this.isDownOnBoard = hover.length === 0;
		this.isDrawingRectangle = this.shouldDrawSelectionRectangle(hover);

		if (this.isDrawingRectangle) {
			return this.startSelectionRectangle();
		}

		const isHoverLocked = hover.every(item => item.transformation.isLocked);
		if (isHoverLocked) {
			return false;
		}

		this.emitCancelDrawSelect();
		return this.initializeUnselectedItemDrag(hover);
	}

	rightButtonDown(): boolean {
		if (this.isLeftDown || this.isMiddleDown) {
			return false;
		}
		this.clear();
		this.isRightDown = true;
		const { items, selection, pointer } = this.board;

		const selectionMbr = selection.getMbr();
		const isPointerInsideSelection = selectionMbr?.isUnderPoint(pointer.point) ?? false;
		this.isDownOnSelection = isPointerInsideSelection;
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
		const isDrawingSelectionMbr = this.isDrawingRectangle && this.line && this.rect;
		if (isDrawingSelectionMbr) {
			return this.handleSelectionRectangleMove();
		}

		if (this.board.getInterfaceType() !== 'edit') {
			return false;
		}

		this.updateMovementFlag();

		if (this.isCameraPan) {
			return this.handleCameraPanMove(x, y);
		}

		this.updateGuidelines();

		this.updateSnapLines();

		this.highlightFollowItemTarget();

		if (this.isDraggingSelection) {
			return this.handleSelectionDragMove(x, y);
		}

		this.handleUnselectedItemDragMove(x, y);
		return this.updateHoverContext();
	}

	private updateMovementFlag(): void {
		const throttleTime = 10;
		const timeDiff = this.lastPointerMoveEventTime + throttleTime - Date.now();
		const isWithinMovementThrottleWindow = timeDiff > 0;

		if (isWithinMovementThrottleWindow) {
			this.isMovedAfterDown = false;
		} else {
			this.isMovedAfterDown = this.isLeftDown || this.isRightDown || this.isMiddleDown;
		}
	}

	private updateGuidelines(): void {
		const { isShift } = this.board.keyboard;
		const shouldSnapToGuidelines = isShift && this.isLeftDown;

		if (shouldSnapToGuidelines) {
			const mousePosition = this.board.pointer.point;
			const selectionItems = this.board.selection.list();
			const isDraggingMultiSelection = selectionItems.length > 1;
			const isDraggingUnselectedItem = !!this.downOnItem;
			const singleSelectedItem = this.board.selection.items.getSingle();
			const isDraggingSingleSelection = this.isDraggingSelection && !!singleSelectedItem;

				if (isDraggingMultiSelection) {
					const items = selectionItems;
					this.handleShiftGuidelines(items, mousePosition);
				} else if (isDraggingUnselectedItem) {
					const dragTarget = this.downOnItem!;
					this.handleShiftGuidelines(dragTarget, mousePosition);
				} else if (isDraggingSingleSelection) {
					const dragTarget = singleSelectedItem!;
					this.handleShiftGuidelines(dragTarget, mousePosition);
				}
			} else {
			this.clearGuidelines();
		}
	}

	private updateFramesNesting(selectionMbr: Mbr | undefined, selection: BoardSelection): void {
		const groups: BaseItem[] = this.board.items
			.getEnclosedOrCrossed(
				selectionMbr!.left,
				selectionMbr!.top,
				selectionMbr!.right,
				selectionMbr!.bottom
			)
			.filter((item) => !!("index" in item && item.index))
			.filter(group => !selection.items.list().includes(group));
		const draggingGroupsIds = selection
			.list()
			.filter(item => !!("index" in item && item.index))
			.map(group => group.getId());
		selection.list().forEach(item => {
			const isContainerItem = !!('index' in item && item.index);
			const isNestedInsideDraggingGroup = draggingGroupsIds.includes(item.parent);
			const shouldCheckItemNesting = !isContainerItem && !isNestedInsideDraggingGroup;

			if (shouldCheckItemNesting) {
				groups.forEach(group => {
					// Skip highlight for items already inside this group (prevents phantom darkened rect).
					const alreadyInGroup = item instanceof BaseItem && item.parent === group.getId();
					if (group.handleNesting(item) && !alreadyInGroup) {
						this.nestingHighlighter.add(group, item);
					} else {
						this.nestingHighlighter.remove(item);
					}
				});
			}
		});
	}

	private updateSnapLines(): void {
		const alignmentItem = this.getAlignmentItem();
		const hasAlignmentTarget = !!alignmentItem;
		const isUsingCanvasPreview = !!this.canvasDrawer.getLastCreatedCanvas();

		if (hasAlignmentTarget) {
			if (isUsingCanvasPreview) {
				this.snapLines = this.alignmentHelper.checkAlignment(
					alignmentItem,
					this.board.selection.list()
				);
			} else {
				this.snapLines = this.alignmentHelper.checkAlignment(alignmentItem);
			}
		} else {
			this.snapLines = { verticalLines: [], horizontalLines: [] };
		}
	}

	private getAlignmentItem(): Item | Item[] | null {
		let finalItem: Item | Item[] | null = null;

		const singleItem = this.board.selection.items.getSingle();
		const hasAlignmentSource = this.downOnItem?.isAlignmentSource() ?? false;
		const isDraggingConnectorHandle = !hasAlignmentSource;
		const isDraggingSingleSelectedItem = this.isDraggingSelection && !!singleItem;
		const isDraggingMultiSelection =
			this.isDownOnSelection &&
			this.isDraggingSelection &&
			this.board.selection.items.list().length > 1;

		if (isDraggingConnectorHandle) {
			return null;
		}
		if (this.isDownOnUnselectedItem) {
			finalItem = this.downOnItem;
		}
		if (isDraggingSingleSelectedItem) {
			finalItem = singleItem;
		}

		if (isDraggingMultiSelection) {
			finalItem = this.board.selection.items.list();
		}

		return finalItem;
	}

	leftButtonUp(): boolean {
		if (!this.isLeftDown) {
			return false;
		}

		this.initialCursorPos = null;

		if (this.hasSelectionRectangleArea()) {
			return this.finishSelectionRectangleSelection();
		}

		if (!this.finalizeDownItemInteraction()) {
			return false;
		}

		if (!this.isMovedAfterDown) {
			return this.handleLeftClickSelection();
		}

		if (this.board.getInterfaceType() !== 'edit') {
			this.board.selection.removeAll();
			this.clear();
			return false;
		}

		const isFinishingUnselectedItemDrag = this.isDraggingUnselectedItem && !!this.downOnItem;
		if (isFinishingUnselectedItemDrag) {
			this.board.selection.removeAll();
			this.clear();
			this.board.tools.publish();
			return false;
		}
		const hasSelectionRectangleState = this.isDrawingRectangle && !!this.line && !!this.rect;
		if (hasSelectionRectangleState) {
			return this.finishSelectionRectangleSelection(true);
		}
		return this.finishLeftDrag();
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
		const isDraggingNonConnectorItem =
			this.isDraggingUnselectedItem &&
			!!this.downOnItem &&
			this.downOnItem.itemType !== 'Connector';
		if (isDraggingNonConnectorItem) {
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
		if (this.board.getInterfaceType() !== 'edit') {
			return false;
		}
		const toEdit = this.board.selection.items.getSingle();
		const isLocked = !!toEdit?.transformation.isLocked;
		const isBusyAiNode = toEdit?.itemType === 'AINode' && !!this.board.aiGeneratingOnItem;

		if (isLocked || isBusyAiNode) {
			return false;
		}

		this.board.selection.editTextUnderPointer();

		if (this.board.selection.getIsLockedSelection()) {
			return false;
		}

		toEdit?.getRichText()?.saveLastClickPoint(this.board.pointer.point.copy(), this.board.camera);
		this.board.selection.editText();
		return false;
	}

	onCancel(): void {
		if (this.board.selection.showQuickAddPanel) {
			this.board.selection.showQuickAddPanel = false;
			this.board.selection.subject.publish(this.board.selection);
		} else if (this.board.selection.getContext() === 'EditTextUnderPointer') {
			this.board.selection.setContext('EditUnderPointer');
		} else if (this.board.selection.items.list().length > 0) {
			this.board.selection.removeAll();
		}
	}

	onConfirm(): void {
		const single = this.board.selection.items.getSingle();
		const isQuickAddConnector =
			this.board.selection.showQuickAddPanel && !!single && single instanceof Connector;
		const canEditSelectionAsText =
			!!single &&
			this.board.selection.getContext() !== 'EditTextUnderPointer' &&
			!this.board.selection.getIsLockedSelection();
		const shouldSplitSafariTextNode =
			isSafari() &&
			this.board.selection.getContext() === 'EditTextUnderPointer' &&
			!this.board.selection.getIsLockedSelection();

		if (isQuickAddConnector) {
			quickAddItem(this.board, 'Rectangle', single);
		} else if (canEditSelectionAsText) {
			this.board.selection.editText(undefined, true);
		} else if (shouldSplitSafariTextNode) {
			if ((single && 'text' in single) || single instanceof RichText) {
				const text = single instanceof RichText ? single : single.text;
				text.editor.splitNode();
			}
		}
	}

	render(context: DrawingContext): void {
		const { isShift } = this.board.keyboard;
		if (this.canvasDrawer.getLastCreatedCanvas()) {
			const mbr = this.canvasDrawer.getMbr();
			mbr.borderColor = 'red';
			mbr.render(context);
		}
		if (this.isDrawingRectangle && this.rect) {
			this.rect.strokeWidth = 1 / this.board.camera.getScale();
			this.rect.render(context);
		} else {
			this.nestingHighlighter.render(context);
		}

		this.alignmentHelper.renderSnapLines(context, this.snapLines, this.board.camera.getScale());

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

registerTool({ name: 'Select', tool: Select });
