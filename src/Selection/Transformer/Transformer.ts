import { Board } from "Board";
import createCanvasDrawer, { CanvasDrawer } from "drawMbrOnCanvas";
import { Frame, Item, Line, Mbr, Point, RichText, Shape } from "Items";
import { AINode } from "Items/AINode/AINode";
import { Anchor } from "Items/Anchor";
import { DrawingContext } from "Items/DrawingContext";
import { Geometry } from "Items/Geometry";
import { Sticker } from "Items/Sticker";
import { Selection } from "Selection";
import { SelectionItems } from "Selection/SelectionItems";
import { conf } from "Settings";
import { createDebounceUpdater } from "Tools/DebounceUpdater";
import { NestingHighlighter } from "Tools/NestingHighlighter";
import AlignmentHelper from "Tools/RelativeAlignment";
import { Tool } from "Tools/Tool";
import {
  AnchorType,
  getAnchorFromResizeType,
} from "./TransformerHelpers/AnchorType";
import { getOppositePoint } from "./TransformerHelpers/getOppositePoint";
import { getProportionalResize } from "./TransformerHelpers/getResizeMatrix";
import {
  getResizeType,
  ResizeType,
} from "./TransformerHelpers/getResizeType.ts";
import { getTextResizeType } from "./TextTransformer/getTextResizeType";
import { getFollowingComments } from "Selection/Transformer/TransformerHelpers/getFollowingComments";
import { handleMultipleItemsResize } from "Selection/Transformer/TransformerHelpers/handleMultipleItemsResize";
import { transformShape } from "Selection/Transformer/TransformerHelpers/ransformShape";
import { transformRichText } from "Selection/Transformer/TransformerHelpers/transformRichText";
import { transformAINode } from "Selection/Transformer/TransformerHelpers/transformAINode";
import { transformItems } from "Selection/Transformer/TransformerHelpers/transformItems";
import { updateFrameChildren } from "Selection/Transformer/TransformerHelpers/updateFrameChildren";

export class Transformer extends Tool {
  anchorType: AnchorType = "default";
  resizeType?: ResizeType;
  oppositePoint?: Point;
  mbr: Mbr | undefined;
  // original mbr when resize was triggered
  startMbr: Mbr | undefined;
  clickedOn?: ResizeType;
  private nestingHighlighter = new NestingHighlighter();
  beginTimeStamp = Date.now();
  canvasDrawer: CanvasDrawer;
  debounceUpd = createDebounceUpdater();
  isShiftPressed = false;
  onPointerUpCb: null | (() => void) = null;
  private alignmentHelper: AlignmentHelper;
  private snapLines: { verticalLines: Line[]; horizontalLines: Line[] } = {
    verticalLines: [],
    horizontalLines: [],
  };
  private snapCursorPos: Point | null = null;
  private initialCursorPos: Point | null = null;

  constructor(private board: Board, private selection: Selection) {
    super();
    this.canvasDrawer = createCanvasDrawer(board);

    selection.subject.subscribe(() => {
      if (!this.resizeType) {
        this.mbr = this.selection.getMbr();
      }
    });

    this.alignmentHelper = new AlignmentHelper(
      board,
      board.index,
      this.canvasDrawer,
      this.debounceUpd
    );
  }

  updateAnchorType(): void {
    const pointer = this.board.pointer;
    const resizeType = this.getResizeType();
    const anchorType = getAnchorFromResizeType(resizeType);
    pointer.setCursor(anchorType);
    this.anchorType = anchorType;
  }

  keyDown(key: string): boolean {
    if (key === "Shift") {
      this.isShiftPressed = true;
      return true;
    }
    return false;
  }

  keyUp(key: string): boolean {
    if (key === "Shift") {
      this.isShiftPressed = false;
      return true;
    }
    return false;
  }

  getResizeType(): ResizeType | undefined {
    const mbr = this.selection.getMbr();
    const pointer = this.board.pointer;
    const camera = this.board.camera;
    const items = this.selection.items;
    const item = items.getSingle();

    let resizeType: ResizeType | undefined;
    if (item && (item.itemType === "RichText" || item.itemType === "Sticker")) {
      resizeType = getTextResizeType(pointer.point, camera.getScale(), mbr);
    } else {
      resizeType = getResizeType(pointer.point, camera.getScale(), mbr);
    }
    return resizeType;
  }

  updateAlignmentBySnapLines(single: Item | null): void {
    if (single) {
      this.snapLines = this.alignmentHelper.checkAlignment(single);
      const snapped = this.alignmentHelper.snapToSide(
        single,
        this.snapLines,
        this.beginTimeStamp,
        this.resizeType
      );

      if (snapped) {
        this.mbr = single.getMbr();
      }
    }
  }

  leftButtonDown(): boolean {
    const isLockedItems = this.selection.getIsLockedSelection();
    if (isLockedItems) {
      return false;
    }

    this.updateAnchorType();
    const mbr = this.selection.getMbr();
    this.resizeType = this.getResizeType();
    this.clickedOn = this.getResizeType();
    if (this.resizeType && mbr) {
      this.oppositePoint = getOppositePoint(this.resizeType, mbr);
      this.mbr = mbr;
      this.startMbr = mbr;
    }
    this.beginTimeStamp = Date.now();
    return this.resizeType !== undefined;
  }

  leftButtonUp(): boolean {
    const isLockedItems = this.selection.getIsLockedSelection();
    if (isLockedItems) {
      return false;
    }

    if (this.onPointerUpCb) {
      this.onPointerUpCb();
      this.onPointerUpCb = null;
    }

    if (
      this.canvasDrawer.getLastCreatedCanvas() &&
      this.clickedOn &&
      this.mbr &&
      this.oppositePoint
    ) {
      const isWidth = this.clickedOn === "left" || this.clickedOn === "right";
      const isHeight = this.clickedOn === "top" || this.clickedOn === "bottom";
      const resize = getProportionalResize(
        this.clickedOn,
        this.board.pointer.point,
        this.mbr,
        this.oppositePoint
      );
      const translation = handleMultipleItemsResize({
        board: this.board,
        resize,
        initMbr: this.mbr,
        isWidth,
        isHeight,
        isShiftPressed: this.isShiftPressed,
      });
      this.selection.transformMany(translation, this.beginTimeStamp);
      this.mbr = resize.mbr;
      this.debounceUpd.setFalse();
    }

    this.updateAnchorType();
    const wasResising = this.resizeType !== undefined;
    if (wasResising) {
      this.selection.nestSelectedItems();
    }

    this.resizeType = undefined;
    this.clickedOn = undefined;
    this.oppositePoint = undefined;
    this.mbr = undefined;
    this.nestingHighlighter.clear();
    this.beginTimeStamp = Date.now();
    this.canvasDrawer.clearCanvasAndKeys();
    this.board.selection.subject.publish(this.board.selection);
    this.snapLines = { verticalLines: [], horizontalLines: [] };
    return wasResising;
  }

  pointerMoveBy(_x: number, _y: number): boolean {
    if (this.board.getInterfaceType() !== "edit") {
      return false;
    }
    const isLockedItems = this.selection.getIsLockedSelection();
    if (isLockedItems) {
      return false;
    }

    this.updateAnchorType();
    if (!this.resizeType) {
      return false;
    }

    const mbr = this.mbr;
    const list = this.selection.items.list();

    if (!mbr || list.length === 0 || !this.oppositePoint) {
      return false;
    }

    const isWidth = this.resizeType === "left" || this.resizeType === "right";
    const isHeight = this.resizeType === "top" || this.resizeType === "bottom";
    const single = this.selection.items.getSingle();
    const followingComments = getFollowingComments(this.board, single);

    if (single?.transformation.isLocked) {
      this.board.pointer.setCursor("default");
      return false;
    }

    this.updateAlignmentBySnapLines(single);

    if (
      single instanceof Shape ||
      single instanceof Sticker ||
      single instanceof Frame
    ) {
      const { resizedMbr, translation } = transformShape({
        board: this.board,
        mbr,
        isWidth,
        isHeight,
        isShiftPressed: this.isShiftPressed,
        single,
        resizeType: this.resizeType,
        oppositePoint: this.oppositePoint,
        followingComments,
        startMbr: this.startMbr,
      });
      this.mbr = resizedMbr;
      if (translation) {
        this.selection.transformMany(translation, this.beginTimeStamp);
      }
    } else if (single instanceof RichText) {
      if (!this.mbr) {
        return false;
      }
      const transformationData = transformRichText({
        board: this.board,
        single,
        isWidth,
        isHeight,
        isShiftPressed: this.isShiftPressed,
        mbr,
        followingComments,
        oppositePoint: this.oppositePoint,
        resizeType: this.resizeType,
      });

      if (transformationData) {
        this.mbr = transformationData.resizedMbr;
        if (transformationData.onPointerUpCb) {
          this.onPointerUpCb = transformationData.onPointerUpCb;
        }
      }
    } else if (single instanceof AINode) {
      this.mbr = transformAINode({
        board: this.board,
        single,
        isWidth,
        isHeight,
        isShiftPressed: this.isShiftPressed,
        mbr,
        followingComments,
        oppositePoint: this.oppositePoint,
        resizeType: this.resizeType,
      });
    } else {
      const newMbr = transformItems({
        mbr,
        board: this.board,
        isShiftPressed: this.isShiftPressed,
        oppositePoint: this.oppositePoint,
        resizeType: this.resizeType,
        debounceUpd: this.debounceUpd,
        alignmentHelper: this.alignmentHelper,
        isWidth,
        isHeight,
        beginTimeStamp: this.beginTimeStamp,
        canvasDrawer: this.canvasDrawer,
        selection: this.selection,
        single,
        snapCursorPos: this.snapCursorPos,
        setSnapCursorPos: this.setSnapCursorPos.bind(this),
      });
      if (!newMbr) {
        return false;
      }
      this.mbr = newMbr;
    }

    updateFrameChildren({
      board: this.board,
      mbr,
      nestingHighlighter: this.nestingHighlighter,
    });

    this.selection.off();
    this.selection.subject.publish(this.selection);

    return true;
  }

  setSnapCursorPos(position: Point | null) {
    this.snapCursorPos = position;
  }

  render(context: DrawingContext): void {
    const mbr = this.mbr;
    const isLockedItems = this.selection.getIsLockedSelection();

    if (mbr) {
      mbr.strokeWidth = 1 / context.matrix.scaleX;

      const selectionColor = isLockedItems
        ? conf.SELECTION_LOCKED_COLOR
        : conf.SELECTION_COLOR;
      mbr.borderColor = selectionColor;
      mbr.render(context);
    }

    this.alignmentHelper.renderSnapLines(
      context,
      this.snapLines,
      this.board.camera.getScale()
    );

    if (!isLockedItems) {
      const anchors = this.calcAnchors();
      for (const anchor of anchors) {
        anchor.render(context);
      }
    }

    this.nestingHighlighter.render(context);
  }

  handleSelectionUpdate(_items: SelectionItems): void {
    // do nothing
  }

  calcAnchors(): Geometry[] {
    const mbr = this.mbr;
    const anchors: Geometry[] = [];
    if (mbr) {
      const { left, top, right, bottom } = mbr;
      const points = [
        new Point(left, top),
        new Point(right, top),
        new Point(left, bottom),
        new Point(right, bottom),
      ];
      for (const point of points) {
        const circle = new Anchor(
          point.x,
          point.y,
          conf.SELECTION_ANCHOR_RADIUS,
          conf.SELECTION_COLOR,
          conf.SELECTION_ANCHOR_COLOR,
          conf.SELECTION_ANCHOR_WIDTH
        );
        anchors.push(circle);
      }
    }
    return anchors;
  }
}
