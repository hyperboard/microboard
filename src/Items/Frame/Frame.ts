import {
  Mbr,
  Line,
  Point,
  Transformation,
  Path,
  Paths,
  Item,
  RichText,
  Matrix,
} from "..";
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
import {translateElementBy} from "HTMLRender";
import {DefaultFrameData, FRAME_TITLE_COLOR, FrameData} from "./FrameData";
import {DocumentFactory} from "api/DocumentFactory";

import {conf} from "Settings";
import {
  getResize,
  getProportionalResize,
} from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import {ResizeType} from "Selection/Transformer/TransformerHelpers/getResizeType";
import {BaseItem} from "../BaseItem";
import {SimpleSpatialIndex} from "../../SpatialIndex/SpacialIndex";

const defaultFrameData = new DefaultFrameData();

export class Frame extends BaseItem {
  readonly itemType = "Frame";
  parent = "Board";
  readonly transformation: Transformation;
  readonly subject = new Subject<Frame>();
  private textContainer: Mbr;
  private path: Path;
  private children: string[] = [];
  private mbr: Mbr = new Mbr();
  readonly linkTo: LinkTo;
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
    this.textContainer = Frames[this.shapeType].textBounds.copy();
    this.path = Frames[this.shapeType].path.copy();
    this.transformation = new Transformation(this.id, board.events);
    this.linkTo = new LinkTo(this.id, board.events);

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
      {...conf.DEFAULT_TEXT_STYLES, fontColor: FRAME_TITLE_COLOR}
    );
    this.text.setSelectionHorisontalAlignment("left");
    this.transformation.subject.subscribe(() => {
      this.transformPath();
      this.updateMbr();
      this.text.transformCanvas();
      this.subject.publish(this);
    });
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

  /** Sets parent of child and emits add child message */
  // emitAddChild(children: Item[]): void {
  //   const childrenIds = children.map((child) => {
  //     child.parent = this.getId();
  //     return child.getId();
  //   });
  //   this.addChild(childrenIds);
  // }

  // emitRemoveChild(children: Item[] | Item): void {
  //   const newChildren = Array.isArray(children) ? children : [children];
  //   const childrenIds = newChildren.map((child) => {
  //     child.parent = "Board";
  //     return child.getId();
  //   });
  //   this.removeChild(childrenIds);
  // }

  // emitNesting(children: Item[]): void {
  //   const itemsToAdd: Item[] = [];
  //   const itemsToRemove: Item[] = [];
  //
  //   children.forEach((child) => {
  //     if (this.handleNesting(child)) {
  //       itemsToAdd.push(child);
  //     } else {
  //       itemsToRemove.push(child);
  //     }
  //   });
  //   this.emitAddChild(itemsToAdd);
  //   this.emitRemoveChild(itemsToRemove);
  // }

  /**
   * Parent cant be child,
   * Child cant be itself,
   * frame cant be child
   */
  // private addChild(childId: string[]): void {
  //   this.emit({
  //     class: "Frame",
  //     method: "addChild",
  //     item: [this.getId()],
  //     childId,
  //   });
  // }

  // private removeChild(childId: string[]): void {
  //   this.emit({
  //     class: "Frame",
  //     method: "removeChild",
  //     item: [this.getId()],
  //     childId,
  //   });
  // }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  /**
   * Returns:
   * true - if can be child of the frame
   * false - if outside of the frame
   */
  // handleNesting(
  //   item: Item | Mbr,
  //   options?: {
  //     onlyForOut?: boolean;
  //     cancelIfChild?: boolean;
  //   }
  // ): boolean {
  //   const isItem = "itemType" in item;
  //   const itemMbr = isItem ? item.getMbr() : item;
  //   if (item instanceof Frame) {
  //     return false;
  //   }
  //   if (options?.cancelIfChild && isItem && item.parent !== "Board") {
  //     return false;
  //   }
  //
  //   const frameMbr = this.getMbr().copy();
  //   if (item.isEnclosedOrCrossedBy(frameMbr)) {
  //     if (frameMbr.isInside(itemMbr.getCenter())) {
  //       if (!options || !options.onlyForOut) {
  //         return true;
  //       }
  //     }
  //   }
  //   return false;
  // }

  private initPath(): void {
    this.path = Frames[this.shapeType].path.copy();
    this.textContainer = Frames[this.shapeType].textBounds.copy();
    this.text.setContainer(this.textContainer.copy());
    this.text.updateElement();
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
    return this.index?.list().map(item => item.getId()) || [];
  }

  updateMbr(): void {
    const rect = this.path.getMbr().copy();
    this.mbr = rect;
  }

  getMbr(): Mbr {
    return this.mbr.copy();
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
        matrix: this.transformation.matrix,
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

    this.transformation.scaleByTranslateBy(
      {
        x: scaleX,
        y: scaleY,
      },
      {
        x: translateX,
        y: translateY,
      },
      timeStamp
    );

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
    this.transformation.scaleTo(scale.x, scale.y);
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

  serialize(): FrameData {
    return {
      itemType: "Frame",
      shapeType: this.shapeType,
      backgroundColor: this.backgroundColor,
      backgroundOpacity: this.backgroundOpacity,
      borderColor: this.borderColor,
      borderOpacity: this.borderOpacity,
      borderStyle: this.borderStyle,
      borderWidth: this.borderWidth,
      transformation: this.transformation.serialize(),
      children: this.index?.list().map((child) => child.getId()) || [],
      text: this.text.serialize(),
      canChangeRatio: this.canChangeRatio,
      linkTo: this.linkTo.serialize(),
    };
  }

  deserialize(data: Partial<FrameData>): this {
    if (data.shapeType) {
      this.shapeType = data.shapeType ?? this.shapeType;
      this.initPath();
    }
    this.linkTo.deserialize(data.linkTo);
    this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
    this.backgroundOpacity = data.backgroundOpacity ?? this.backgroundOpacity;
    this.borderColor = data.borderColor ?? this.borderColor;
    this.borderOpacity = data.borderOpacity ?? this.borderOpacity;
    this.borderStyle = data.borderStyle ?? this.borderStyle;
    this.borderWidth = data.borderWidth ?? this.borderWidth;
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
      this.transformPath();
    }
    if (data.children) {
      this.applyAddChildren(data.children);
    }
    if (data.text) {
      this.text.deserialize(data.text);
    }
    this.canChangeRatio = data.canChangeRatio ?? this.canChangeRatio;
    this.subject.publish(this);
    return this;
  }

  getSavedProportionsMatrix(): Matrix {
    const newScale = Math.min(
      this.transformation.matrix.scaleX,
      this.transformation.matrix.scaleY
    );
    const newMatrix = this.transformation.matrix.copy();
    newMatrix.scaleX = newScale;
    newMatrix.scaleY = newScale;
    return newMatrix;
  }

  private transformPath(saveProportions = false): void {
    this.path = Frames[this.shapeType].path.copy();
    this.textContainer = Frames[this.shapeType].textBounds.copy();
    if (saveProportions) {
      const newMatrix = this.getSavedProportionsMatrix();
      this.path.transform(newMatrix);
      this.textContainer.transform(newMatrix);
      this.transformation.applyScaleTo(newMatrix.scaleX, newMatrix.scaleY);
    } else {
      this.path.transform(this.transformation.matrix);
      this.textContainer.transform(this.transformation.matrix);
    }

    // TODO fix text container Y translation
    // const scaleY = this.transformation.getScale().y;
    // const offsetY = (this.textContainer.top - this.getMbr().top) / scaleY;
    // const textMatrix = new Matrix(
    // 	0,
    // 	offsetY,
    // 	1,
    // 	1,
    // );
    // console.log(this.transformation.getScale().y);
    // this.text.setContainer(Frames[this.shapeType].textBounds.copy().getTransformed(textMatrix));

    this.path.setBackgroundColor(this.backgroundColor);
    this.path.setBackgroundOpacity(this.backgroundOpacity);
    this.path.setBorderColor(this.borderColor);
    this.path.setBorderWidth(this.borderWidth);
    this.path.setBorderStyle(this.borderStyle);
    this.path.setBorderOpacity(this.borderOpacity);
    // if (this.shapeType !== "Custom" &&
    // 	(
    // 		(this.mbr.getWidth() / this.getMbr().getHeight()).toFixed(0)) !==
    // 	FRAME_TYPES.find(fr => fr.id === this.shapeType)?.label))
  }

  apply(op: Operation): void {
    super.apply(op)
    switch (op.class) {
      case "Frame":
        if (op.method === "setBackgroundColor") {
          this.applyBackgroundColor(op.backgroundColor);
        } else if (op.method === "setCanChangeRatio") {
          this.applyCanChangeRatio(op.canChangeRatio);
        } else if (op.method === "setFrameType") {
          this.applyFrameType(op.shapeType);
        } else if (op.method === "addChild") {
          this.applyAddChildren(op.childId);
        } else if (op.method === "removeChild") {
          this.applyRemoveChildren(op.childId);
        }
        break;
      case "RichText":
        this.text.apply(op);
        break;
      case "LinkTo":
        this.linkTo.apply(op);
        break;
      default:
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
      points.push(anchorPoint.getTransformed(this.transformation.matrix));
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
      this.transformation.applyScaleTo(scale.x, scale.y);
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

  getBorderColor(): string {
    return this.borderColor;
  }

  getBorderWidth(): number {
    return this.borderWidth;
  }

  getBackgroundColor(): string {
    return this.backgroundColor;
  }

  setNewShape(type: FrameType | null): void {
    this.newShape = type;
    this.subject.publish(this);
  }

  private applyBackgroundColor(backgroundColor: string): void {
    this.backgroundColor = backgroundColor;
    this.path.setBackgroundColor(backgroundColor);
  }

  setBackgroundColor(backgroundColor: string): void {
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
    super.render(context);
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

  // smell have to redo without document
  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("frame-item");
    div.id = this.getId();

    div.style.backgroundColor = this.backgroundColor;
    div.style.opacity = this.backgroundOpacity.toString();

    div.style.borderColor = this.borderColor;
    div.style.borderWidth = `${this.borderWidth}px`;
    div.style.borderStyle = this.borderStyle;

    const {translateX, translateY, scaleX, scaleY} =
      this.transformation.matrix;

    // const transform = `translate(${Math.round(translateX)}px, ${Math.round(translateY)}px) scale(${scaleX}, ${scaleY})`;
    const transform = `translate(${Math.round(translateX)}px, ${Math.round(
      translateY
    )}px) scale(1, 1)`;

    const width = this.getMbr().getWidth();
    const height = this.getMbr().getHeight();
    // const path = Frames[this.shapeType].path.copy();
    // const unscaledMbr = path.getMbr();
    // const unscaledWidth = unscaledMbr.getWidth();
    // const unscaledHeight = unscaledMbr.getHeight();

    // div.style.width = `${unscaledWidth}px`;
    // div.style.height = `${unscaledHeight}px`;
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    // div.setAttribute("data-shape-type", this.shapeType);

    const textElement = this.text.renderHTML(documentFactory);
    textElement.style.transform = `translate(0px, -30px) scale(1, 1)`;
    // positionRelatively(textElement,  div);
    // resetElementScale(textElement);
    // scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
    // translateElementBy(textElement, 0, -45 / scaleY);
    textElement.id = `${this.getId()}_text`;
    textElement.style.overflow = "visible";
    div.appendChild(textElement);

    div.setAttribute("data-link-to", this.linkTo.serialize() || "");
    if (this.getLinkTo()) {
      const linkElement = this.linkTo.renderHTML(documentFactory);
      translateElementBy(
        linkElement,
        width - parseInt(linkElement.style.width),
        0
      );
      div.appendChild(linkElement);
    }

    return div;
  }

  getRichText(): RichText {
    return this.text;
  }
}
