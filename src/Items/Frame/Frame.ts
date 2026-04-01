import { Mbr } from "../Mbr/Mbr";
import { Line } from "../Line/Line";
import { Point } from "../Point/Point";
import { Transformation } from "../Transformation/Transformation";
import { Path } from "../Path/Path";
import { Paths } from "../Path/Paths";
import type { Item } from "../Item";
import { RichText } from "../RichText/RichText";
import { transformOps } from "../Transformation/transformOps";
import { Matrix } from "../Transformation/Matrix";
import { BaseItem, BaseItemData, SerializedItemData } from "../BaseItem/BaseItem";
import { TransformParams, TransformResult } from "../BaseItem/TransformContext";
import { transformShape } from "Selection/Transformer/TransformerHelpers/transformShape";
import {Subject} from "Subject";
import {DrawingContext} from "../DrawingContext";
import {Operation} from "Events";
import {FrameOperation} from "./FrameOperation";
import {Frames, FrameType} from "./Basic";
import {GeometricNormal} from "../GeometricNormal";
import {FrameCommand} from "./FrameCommand";
import {Board} from "Board";
import {
  exportBoardSnapshot,
  SnapshotInfo,
} from "Tools/ExportSnapshot/exportBoardSnapshot";
import {LinkTo} from "../LinkTo/LinkTo";

import {DefaultFrameData, FRAME_TITLE_COLOR, FrameData} from "./FrameData";

import {conf} from "Settings";
import {
  getResize,
  getProportionalResize,
} from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import {ResizeType} from "Selection/Transformer/TransformerHelpers/getResizeType";
import {SimpleSpatialIndex} from "../../SpatialIndex/SimpleSpatialIndex";
import { ColorValue, coerceColorValue, resolveColor } from "Color";

const defaultFrameData = new DefaultFrameData();

const HEADING_TOP_OFFSET = -33;
const HEADING_BOTTOM_OFFSET = -5;

export class Frame extends BaseItem<Frame> {
  readonly itemType = "Frame";
  parent = "Board";
  readonly subject = new Subject<Frame>();
  private textContainer: Mbr = new Mbr();
  private path: Path;
  readonly text: RichText;
  private canChangeRatio = true;
  canBeNested = false;
  newShape: FrameType | null = null;
  transformationRenderBlock?: boolean = undefined;

  constructor(
    board: Board,
    private getItemById: (id: string) => Item | undefined,
    id = "",
    private name = "",
    private shapeType = defaultFrameData.shapeType,
    public backgroundColor = defaultFrameData.backgroundColor,
    public backgroundOpacity = defaultFrameData.backgroundOpacity,
    public borderColor = defaultFrameData.borderColor,
    public borderOpacity = defaultFrameData.borderOpacity,
    public borderStyle = defaultFrameData.borderStyle,
    public borderWidth = defaultFrameData.borderWidth
  ) {
    super(board, id, undefined, true);
    this.path = Frames[this.shapeType].path.copy();

    const textBounds = Frames[this.shapeType].textBounds.copy();
    textBounds.top = HEADING_TOP_OFFSET;
    textBounds.bottom = HEADING_BOTTOM_OFFSET;
    this.textContainer = textBounds;

    this.text = new RichText(
      board,
      this.textContainer,
      this.id,
      this.transformation,
      this.linkTo,
      this.name,
      true,
      false,
      "Frame",
      {...conf.DEFAULT_TEXT_STYLES, fontSize: 18, fontColor: FRAME_TITLE_COLOR}
    );
    this.text.editor.verticalAlignment = "bottom";
    this.text.setSelectionHorisontalAlignment("left");

    this.text.customTransformationMatrix = () => {
      const matrix = this.transformation.toMatrix();
      return new Matrix(matrix.translateX, matrix.translateY, 1, 1);
    };

    this.text.renderingScale = (cameraScale) => {
      // Slightly larger base multiplier (1.2x)
      return Math.max(1, Math.min(6, 1.2 / cameraScale));
    };


    this.text.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
    this.linkTo.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
  }

  setBoard(board: Board): this {
    this.board = board;

    return this;
  }

  addChildItems(children: BaseItem[]): void {
    if (!this.index || children.length === 0) return;
    this.emit({
      class: this.itemType,
      method: "addChildren",
      item: [this.getId()],
      childId: children.map((child) => child.getId()),
    });
  }

  removeChildItems(children: BaseItem[] | BaseItem): void {
    if (!this.index) return;
    const childrenArr = Array.isArray(children) ? children : [children];
    if (childrenArr.length === 0) return;
    this.emit({
      class: this.itemType,
      method: "removeChildren",
      item: [this.getId()],
      childId: childrenArr.map((child) => child.getId()),
    });
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  private initPath(): void {
    this.path = Frames[this.shapeType].path.copy();
    this.updateTextContainer();
  }

  private updateTextContainer(): void {
    const textBounds = Frames[this.shapeType].textBounds.copy();
    textBounds.top = HEADING_TOP_OFFSET;
    textBounds.bottom = HEADING_BOTTOM_OFFSET;
    this.textContainer = textBounds;
    if (this.text) {
      this.text.setContainer(this.textContainer.copy());
      this.text.updateElement();
    }
  }

  getPaths(): Path | Paths {
    return this.path;
  }

  getPath(): Path | Paths {
    return this.path.copy();
  }

  copyPaths(): Path | Paths {
    return this.path.copy();
  }

  isTextUnderPoint(point: Point): boolean {
    return this.text.isUnderPoint(point);
  }

  getUnderPoint(point: Point): boolean {
    return this.path.isUnderPoint(point) || this.isTextUnderPoint(point);
  }

  isClosed(): boolean {
    return this.path instanceof Path && this.path.isClosed();
  }

  setId(id: string): this {
    this.id = id;
    this.text.setId(id);
    this.transformation.setId(id);
    this.linkTo.setId(id);
    return this;
  }

  getId(): string {
    return this.id;
  }

  getChildrenIds(): string[] {
    return this.index?.listAll().map(item => item.getId()) || [];
  }

  updateMbr(): void {
    const rect = this.path.getMbr().copy();
    this.mbr.left = rect.left;
    this.mbr.top = rect.top;
    this.mbr.right = rect.right;
    this.mbr.bottom = rect.bottom;
  }

  doResize(
    resizeType: ResizeType,
    pointer: Point,
    mbr: Mbr,
    opposite: Point,
    startMbr: Mbr,
    timeStamp: number
  ): { matrix: Matrix; mbr: Mbr } {
    const res = this.getCanChangeRatio()
      ? getResize(resizeType, pointer, mbr, opposite)
      : getProportionalResize(resizeType, pointer, mbr, opposite);

    if (!res) {
      return {
        matrix: this.transformation.toMatrix(),
        mbr: this.getMbr(),
      };
    }

    let {scaleX, scaleY, translateX, translateY} = res.matrix;

    if (this.getCanChangeRatio() && this.shapeType !== "Custom") {
      this.setFrameType("Custom");
    }

    const initMbr = Frames[this.shapeType].path.copy().getMbr();

    if (
      this.mbr.right - this.mbr.left < initMbr.getWidth() &&
      res.matrix.scaleX < 1
    ) {
      scaleX = 1;
      translateX = 0;
    }

    if (
      this.mbr.bottom - this.mbr.top < initMbr.getHeight() &&
      res.matrix.scaleY < 1
    ) {
      scaleY = 1;
      translateY = 0;
    }

    const oldMatrix = this.transformation.toMatrix();
    this.apply(transformOps.applyMatrix(this.id, {
      translateX: translateX,
      translateY: translateY,
      scaleX: scaleX,
      scaleY: scaleY,
      shearX: 0,
      shearY: 0,
    }));
    const newMatrix = this.transformation.toMatrix();


    this.setLastFrameScale();
    res.mbr = this.getMbr();
    return res;
  }

  getLastFrameScale(): { x: number; y: number } {
    const scaleString = localStorage.getItem("lastFrameScale");
    return scaleString ? JSON.parse(scaleString) : {x: 4, y: 5.565};
  }

  scaleLikeLastFrame(): void {
    const scale = this.getLastFrameScale();
    this.apply(transformOps.scaleTo(this, scale.x, scale.y));
  }

  setLastFrameScale(): void {
    const aspectRatios = {
      A4: {x: 1, y: 1.41},
      Letter: {x: 1, y: 1.29},
      Frame16x9: {x: 1.78, y: 1},
      Frame4x3: {x: 1.33, y: 1},
      Frame1x1: {x: 1, y: 1},
      Frame3x2: {x: 1.5, y: 1},
      Frame9x18: {x: 1, y: 2},
      Custom: {x: 1, y: 1},
    };
    const proportionalScale = {
      x: this.transformation.getScale().x * aspectRatios[this.getFrameType()].x,
      y: this.transformation.getScale().y * aspectRatios[this.getFrameType()].y,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("lastFrameScale", JSON.stringify(proportionalScale));
    }
  }

  serialize(): SerializedItemData<FrameData> {
    return {
      id: this.id,
      itemType: "Frame",
      shapeType: this.shapeType,
      backgroundColor: this.backgroundColor,
      backgroundOpacity: this.backgroundOpacity,
      borderColor: this.borderColor,
      borderOpacity: this.borderOpacity,
      borderStyle: this.borderStyle,
      borderWidth: this.borderWidth,
      transformation: this.transformation.serialize(),
      childIds: this.childIds,
      text: this.text.serialize(),
      canChangeRatio: this.canChangeRatio,
      linkTo: this.linkTo.serialize(),
    };
  }

  deserialize(data: SerializedItemData<FrameData> | FrameData): this {
    if (data.shapeType) {
      this.shapeType = data.shapeType ?? this.shapeType;
      this.initPath();
    }
    this.linkTo.deserialize(data.linkTo);
    if (data.backgroundColor != null) {
      this.backgroundColor = coerceColorValue(data.backgroundColor);
    }
    this.backgroundOpacity = data.backgroundOpacity ?? this.backgroundOpacity;
    if (data.borderColor != null) {
      this.borderColor = coerceColorValue(data.borderColor);
    }
    this.borderOpacity = data.borderOpacity ?? this.borderOpacity;
    this.borderStyle = data.borderStyle ?? this.borderStyle;
    this.borderWidth = data.borderWidth ?? this.borderWidth;
    if (data.childIds) {
      this.childIds = data.childIds || [];
    }
    if (data.text) {
      this.text.deserialize(data.text);
      // Re-apply offsets and ensure container is local
      this.updateTextContainer();
    }
    // Apply item-level transformation AFTER text.deserialize, because RichText.deserialize
    // also calls this.transformation.deserialize (same reference) with stale local coords.
    // The item-level transformation must always win.
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
      this.transformPath();
      this.updateMbr();
      this.text.transformCanvas();
      this.updateChildrenIds();
    }
    this.canChangeRatio = data.canChangeRatio ?? this.canChangeRatio;
    this.subject.publish(this);
    return this;
  }

  getSavedProportionsMatrix(): Matrix {
    const { scaleX, scaleY } = this.transformation.getMatrixData();
    const newScale = Math.min(scaleX, scaleY);
    const newMatrix = this.transformation.toMatrix();
    newMatrix.scaleX = newScale;
    newMatrix.scaleY = newScale;
    return newMatrix;
  }

  private transformPath(saveProportions = false): void {
    this.path = Frames[this.shapeType].path.copy();
    this.updateTextContainer();
    if (saveProportions) {
      const newMatrix = this.getSavedProportionsMatrix();
      this.path.transform(newMatrix);
      this.apply(transformOps.scaleTo(this, newMatrix.scaleX, newMatrix.scaleY));
    } else {
      this.path.transform(this.transformation.toMatrix());
    }

    this.path.setBackgroundOpacity(this.backgroundOpacity);
    this.path.setBorderWidth(this.borderWidth);
    this.path.setBorderStyle(this.borderStyle);
    this.path.setBorderOpacity(this.borderOpacity);
  }

  apply(op: Operation): void {
    // Handle Frame children ops here (before super) to avoid BaseItem reading
    // the wrong field — Frame uses childId[], BaseItem expects newData.childIds.
    if (op.class === "Frame") {
      if (op.method === "addChildren" || op.method === "addChild") {
        this.applyAddChildren(op.childId);
        this.subject.publish(this);
        return;
      } else if (op.method === "removeChildren" || op.method === "removeChild") {
        this.applyRemoveChildren(op.childId);
        this.subject.publish(this);
        return;
      }
    }
    switch (op.class) {
      case "Transformation":
        super.apply(op);
        this.transformPath();
        this.updateMbr();
        this.text.transformCanvas();
        break;
      case "Frame":
        if (op.method === "setBackgroundColor") {
          this.applyBackgroundColor(op.backgroundColor);
        } else if (op.method === "setCanChangeRatio") {
          this.applyCanChangeRatio(op.canChangeRatio);
        } else if (op.method === "setFrameType") {
          this.applyFrameType(op.shapeType);
        }
        break;
      case "RichText":
        this.text.apply(op);
        break;
      default:
        super.apply(op);
        return;
    }
    this.subject.publish(this);
  }

  emit(operation: FrameOperation): void {
    if (this.board.events) {
      const command = new FrameCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
    } else {
      this.apply(operation);
    }
  }

  getNearestEdgePointTo(point: Point): Point {
    return this.path.getNearestEdgePointTo(point);
  }

  getDistanceToPoint(point: Point): number {
    const nearest = this.getNearestEdgePointTo(point);
    return point.getDistance(nearest);
  }

  // isUnderPoint(point: Point): boolean {
  //   return this.path.isUnderPoint(point);
  // }
  //
  // isNearPoint(point: Point, distance: number): boolean {
  //   return distance > this.getDistanceToPoint(point);
  // }
  //
  // isEnclosedOrCrossedBy(rect: Mbr): boolean {
  //   return this.path.isEnclosedOrCrossedBy(rect);
  // }
  //
  // isEnclosedBy(rect: Mbr): boolean {
  //   return this.getMbr().isEnclosedBy(rect);
  // }

  isInView(rect: Mbr): boolean {
    return this.isEnclosedOrCrossedBy(rect);
  }

  getSnapAnchorPoints(): Point[] {
    const anchorPoints = Frames[this.shapeType].anchorPoints;
    const points: Point[] = [];
    for (const anchorPoint of anchorPoints) {
      points.push(anchorPoint.getTransformed(this.transformation.toMatrix()));
    }
    return points;
  }

  getNormal(point: Point): GeometricNormal {
    return this.path.getNormal(point);
  }

  getIntersectionPoints(segment: Line): Point[] {
    const lines = this.getMbr().getLines();
    const initPoints: Point[] = [];
    const points = lines.reduce((acc, line) => {
      const intersections = line.getIntersectionPoints(segment);
      if (intersections.length > 0) {
        acc.push(...intersections);
      }
      return acc;
    }, initPoints);
    return points;
  }

  getFrameType(): FrameType {
    return this.shapeType;
  }

  private applyFrameType(shapeType: FrameType): void {
    this.shapeType = shapeType;
    if (shapeType !== "Custom") {
      this.setLastFrameScale();
    }
    if (this.newShape === "Custom" || shapeType === "Custom") {
      const scale = this.getLastFrameScale();
      this.apply(transformOps.scaleTo(this, scale.x, scale.y));
      this.transformPath(false);
    } else {
      this.transformPath(true);
    }

    if (this.board) {
      this.getChildrenIds().forEach((childId) => {
        const child = this.board?.items.getById(childId);
        if (child) {
          if (this.handleNesting(child)) {
            this.applyAddChildren([child.getId()]);
            child.parent = this.getId();
          } else {
            this.applyRemoveChildren([child.getId()]);
            child.parent = "Board";
          }
          // this.handleNesting(child);
        }
      });
      const currMbr = this.getMbr();
      this.board.items
        .getEnclosedOrCrossed(
          currMbr.left,
          currMbr.top,
          currMbr.right,
          currMbr.bottom
        )
        .forEach((item) => {
          if (item.parent === "Board") {
            if (this.handleNesting(item)) {
              this.applyAddChildren([item.getId()]);
              item.parent = this.getId();
            }
          }
        });
      this.board.camera.addToView(this.getMbr(), this.board.items.getInView());
    }
    this.applyCanChangeRatio(shapeType === "Custom");
    this.updateMbr();
  }

  setFrameType(shapeType: FrameType): void {
    this.emit({
      class: "Frame",
      method: "setFrameType",
      item: [this.getId()],
      shapeType,
      prevShapeType: this.getFrameType(),
    });
  }

  getCanChangeRatio(): boolean {
    return this.canChangeRatio;
  }

  private applyCanChangeRatio(canChangeRatio: boolean): void {
    this.canChangeRatio = canChangeRatio;
  }

  setCanChangeRatio(canChangeRatio: boolean): void {
    this.emit({
      class: "Frame",
      method: "setCanChangeRatio",
      item: [this.getId()],
      canChangeRatio,
    });
  }

  getBorderColor(): ColorValue {
    return this.borderColor;
  }

  getBorderWidth(): number {
    return this.borderWidth;
  }

  getBackgroundColor(): ColorValue {
    return this.backgroundColor;
  }

  setNewShape(type: FrameType | null): void {
    this.newShape = type;
    this.subject.publish(this);
  }

  private applyBackgroundColor(backgroundColor: ColorValue): void {
    this.backgroundColor = backgroundColor;
  }

  setBackgroundColor(backgroundColor: ColorValue): void {
    this.emit({
      class: "Frame",
      method: "setBackgroundColor",
      item: [this.getId()],
      backgroundColor,
    });
  }

  getExportName(): string {
    return this.text
      .getText()
      .flatMap((el) => (el.type === "paragraph" ? el.children : []))
      .map((child) => (child.type === "text" ? child.text : ""))
      .join(" ");
  }

  export(
    board: Board,
    name: string = this.getExportName()
  ): Promise<SnapshotInfo> {
    return exportBoardSnapshot({
      board,
      nameToExport: name,
      selection: this.getMbr(),
      upscaleTo: 4000,
    });
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    this.renderPath(context);
    // Apply frame's world translation so children can render using their local transforms.
    // Frames act as non-scaling containers.
    const ctx = context.ctx;
    ctx.save();
    const { translateX, translateY } = this.getWorldMatrix();
    ctx.translate(translateX, translateY);
    for (const child of this.index!.items.listAll()) {
      child.render(context);
    }
    ctx.restore();
    this.renderBorders(context);
    this.renderName(context);
  }

  renderName(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    this.text.render(context);
  }

  renderBorders(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    const copy = this.getPath();
    copy.setBackgroundColor("none");
    copy.render(context);
  }

  renderPath(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    this.path.setBackgroundColor(resolveColor(this.backgroundColor, conf.theme, 'background'));
    this.path.setBorderColor(resolveColor(this.borderColor, conf.theme, 'foreground'));
    this.path.render(context);
    this.renderNewShape(context);
    if (this.getLinkTo()) {
      const {top, right} = this.getMbr();
      this.linkTo.render(context, top, right, this.board.camera.getScale());
    }
  }

  renderNewShape(context: DrawingContext): void {
    if (this.newShape) {
      const nMbr = Frames[this.newShape].path.copy().getMbr();
      const nMatrix = this.getSavedProportionsMatrix();
      if (this.newShape === "Custom") {
        const scale = this.getLastFrameScale();
        nMatrix.scaleX = scale.x;
        nMatrix.scaleY = scale.y;
      }
      nMbr.transform(nMatrix);
      nMbr.backgroundColor = "rgba(173, 216, 230, 0.25)";
      nMbr.render(context);
    }
  }

  getRichText(): RichText {
    return this.text;
  }

  getIsScalingContainer(): boolean {
    return false;
  }

  handleTransform(params: TransformParams): TransformResult {
    const { board, mbr, resizeType, oppositePoint, isHeight, isWidth, isShiftPressed, beginTimeStamp, followingComments, startMbr } = params;
    return transformShape({
      board,
      mbr,
      resizeType,
      oppositePoint,
      isHeight,
      isWidth,
      isShiftPressed,
      beginTimeStamp,
      followingComments,
      startMbr,
      single: this as any,
    });
  }
}
