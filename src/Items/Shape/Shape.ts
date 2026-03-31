import { Mbr } from "../Mbr/Mbr";
import { Line } from "../Line/Line";
import { Point } from "../Point/Point";
import { Transformation } from "../Transformation/Transformation";
import { Path } from "../Path/Path";
import { Paths } from "../Path/Paths";
import { Matrix } from "../Transformation/Matrix";
import { TransformationOperation } from "../Transformation/TransformationOperations";
import { Connector } from "../Connector/Connector";
import { connectorOps } from "../Connector/connectorOps";
import { BasicShapes } from "./Basic";
import { ShapeType } from "./index";
import { BorderStyle, BorderWidth, LinePatterns } from "../Path";
import { RichText } from "../RichText";
import { ShapeOperation } from "./ShapeOperation";
import { DefaultShapeData, ShapeData } from "./ShapeData";
import { Geometry } from "../Geometry";
import { DrawingContext } from "../DrawingContext";
import { Operation } from "Events";
import { ShapeCommand } from "./ShapeCommand";
import { GeometricNormal } from "../GeometricNormal";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { LinkToOperation } from "../LinkTo/LinkToOperation";
import { getResize } from "Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { tempStorage } from "SessionStorage";
import { LinkTo } from "../LinkTo/LinkTo";
import { BPMN } from "./BPMN";
import { Board } from "Board";
import { Subject } from "Subject";
import {
  positionRelatively,
  resetElementScale,
  scaleElementBy,
  translateElementBy,
} from "HTMLRender";
import { FixedPoint } from "Items/Connector";
import { toRelativePoint } from "Items/Connector/ControlPoint";
import { conf } from "Settings";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import { ColorValue, coerceColorValue, resolveColor } from "Color";
import { transformOps } from "../Transformation/transformOps";

const defaultShapeData = new DefaultShapeData();

export const Shapes = { ...BasicShapes, ...BPMN };

export class Shape extends BaseItem<Shape> {
  readonly itemType = "Shape";
  parent = "Board";
  private path: Path | Paths;
  private textContainer: Mbr;
  readonly text: RichText;
  readonly subject = new Subject<Shape>();
  transformationRenderBlock?: boolean = undefined;

  constructor(
    board: Board,
    id = "",
    public shapeType = defaultShapeData.shapeType,
    public backgroundColor = defaultShapeData.backgroundColor,
    public backgroundOpacity = defaultShapeData.backgroundOpacity,
    public borderColor = defaultShapeData.borderColor,
    public borderOpacity = defaultShapeData.borderOpacity,
    public borderStyle = defaultShapeData.borderStyle,
    public borderWidth = defaultShapeData.borderWidth,
    private mbr = Shapes[shapeType].path.getMbr().copy()
  ) {
    super(board, id);
    this.path = Shapes[this.shapeType].path.copy();
    this.textContainer = Shapes[this.shapeType].textBounds.copy();
    this.text = new RichText(
      board,
      this.textContainer,
      this.id,
      this.transformation,
      this.linkTo,
      "\u00A0",
      true,
      false,
      "Shape"
    );


    this.text.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
    this.linkTo.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
    this.text.insideOf = this.itemType;
    this.transformPath();
    this.updateMbr();
    this.subject.publish(this);
  }

  private saveShapeData(): void {
    tempStorage.setShapeData({
      shapeType: this.shapeType,
      backgroundColor: this.backgroundColor,
      backgroundOpacity: this.backgroundOpacity,
      borderColor: this.borderColor,
      borderOpacity: this.borderOpacity,
      borderStyle: this.borderStyle,
      borderWidth: this.borderWidth,
    });
  }

  emit(operation: ShapeOperation): void {
    if (this.board.events) {
      const command = new ShapeCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
    } else {
      this.apply(operation);
    }
  }

  serialize(): SerializedItemData<ShapeData> {
    return {
      id: this.id,
      itemType: "Shape",
      shapeType: this.shapeType,
      backgroundColor: this.backgroundColor,
      backgroundOpacity: this.backgroundOpacity,
      borderColor: this.borderColor,
      borderOpacity: this.borderOpacity,
      borderStyle: this.borderStyle,
      borderWidth: this.borderWidth,
      transformation: this.transformation.serialize(),
      text: this.text.serialize(),
      linkTo: this.linkTo.serialize(),
    };
  }

  deserialize(data: SerializedItemData<ShapeData> | ShapeData): this {
    if (data.shapeType) {
      this.shapeType = data.shapeType;
      this.initPath();
    }
    if (data.linkTo) {
      this.linkTo.deserialize(data.linkTo);
    }
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
    if (data.text) {
      this.text.deserialize(data.text);
    }
    // Apply item-level transformation AFTER text.deserialize, because RichText.deserialize
    // also calls this.transformation.deserialize (same reference) with stale local coords.
    // The item-level transformation must always win.
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
      this.transformPath();
    }
    this.transformPath();
    this.text.updateElement();
    this.subject.publish(this);
    return this;
  }

  setId(id: string): this {
    this.id = id;
    this.text.setId(id);
    this.transformation.setId(id);
    this.linkTo.setId(id);
    return this;
  }

  protected onParentChanged(newParent: string): void {
    if (this.text) {
      this.text.parent = newParent;
    }
  }

  getId(): string {
    return this.id;
  }

  apply(op: Operation): void {
    switch (op.class) {
      case "Transformation":
        super.apply(op);
        this.transformPath();
        this.updateMbr();
        const tOp = op as TransformationOperation;
        if (tOp.method === "applyMatrix") {
          const itemOp = tOp.items.find((i) => i.id === this.id);
          if (
            itemOp &&
            itemOp.matrix.scaleX === 1 &&
            itemOp.matrix.scaleY === 1
          ) {
            this.text.transformCanvas();
          } else {
            this.text.updateElement();
          }
        } else {
          this.text.updateElement();
        }
        break;
      case "RichText":
        this.text.apply(op);
        break;
      case "LinkTo":
        this.linkTo.apply(op as LinkToOperation);
        break;
      case "Shape":
        this.applyShapeOperation(op as ShapeOperation);
        this.updateMbr();
        break;
      default:
        super.apply(op);
        return;
    }
    this.subject.publish(this);
  }


  private applyShapeOperation(op: ShapeOperation): void {
    switch (op.method) {
      case "setBackgroundColor":
        this.applyBackgroundColor(op.backgroundColor);
        break;
      case "setBackgroundOpacity":
        this.applyBackgroundOpacity(op.backgroundOpacity);
        break;
      case "setBorderColor":
        this.applyBorderColor(op.borderColor);
        break;
      case "setBorderOpacity":
        this.applyBorderOpacity(op.borderOpacity);
        break;
      case "setBorderStyle":
        this.applyBorderStyle(op.borderStyle);
        break;
      case "setBorderWidth":
        this.applyBorderWidth(op.borderWidth);
        break;
      case "setShapeType":
        this.applyShapeType(op.shapeType);
        break;
    }
    this.saveShapeData();
  }

  getShapeType(): ShapeType {
    return this.shapeType;
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  private applyShapeType(shapeType: ShapeType): void {
    this.shapeType = shapeType;
    this.initPath();
    this.transformPath();
    // Smell: Can we not update connectors in shape?
    // Smell: Can we not iterate over all items?
    for (const connector of this.board.items.listAll()) {
      if (
        connector.itemType === "Connector" &&
        ((connector as Connector).getConnectedItems().endItem?.getId() === this.getId() ||
          (connector as Connector).getConnectedItems().startItem?.getId() === this.getId())
      ) {
        if ((connector as Connector).getConnectedItems().endItem?.getId() === this.getId()) {
          const nearestPoint = this.getNearestEdgePointTo(
            (connector as Connector).getEndPoint().copy()
          );
          (connector as Connector).apply(
            connectorOps.setEndPoint(
              [connector as Connector],
              new FixedPoint(this, toRelativePoint(nearestPoint, this))
            )
          );
        }

        if ((connector as Connector).getConnectedItems().startItem?.getId() === this.getId()) {
          const nearestPoint = this.getNearestEdgePointTo(
            (connector as Connector).getStartPoint().copy()
          );
          (connector as Connector).apply(
            connectorOps.setStartPoint(
              [connector as Connector],
              new FixedPoint(this, toRelativePoint(nearestPoint, this))
            )
          );
        }
      }
    }
  }


  getBackgroundColor(): ColorValue {
    return this.backgroundColor;
  }

  private applyBackgroundColor(backgroundColor: ColorValue): void {
    this.backgroundColor = backgroundColor;
  }


  getBackgroundOpacity(): number {
    return this.backgroundOpacity;
  }

  getBorderColor() {
    return this.borderColor;
  }

  getBorderWidth() {
    return this.borderWidth;
  }

  private applyBackgroundOpacity(backgroundOpacity: number): void {
    this.backgroundOpacity = backgroundOpacity;
    this.path.setBackgroundOpacity(backgroundOpacity);
  }


  getStrokeColor(): ColorValue {
    return this.borderColor;
  }

  private applyBorderColor(borderColor: ColorValue): void {
    this.borderColor = borderColor;
  }


  getBorderOpacity(): number {
    return this.borderOpacity;
  }

  private applyBorderOpacity(borderOpacity: number): void {
    this.borderOpacity = borderOpacity;
    this.path.setBorderOpacity(borderOpacity);
  }


  getBorderStyle(): BorderStyle {
    return this.borderStyle;
  }

  private applyBorderStyle(borderStyle: BorderStyle): void {
    this.borderStyle = borderStyle;
    this.path.setBorderStyle(borderStyle);
  }


  getStrokeWidth(): BorderWidth {
    return this.borderWidth;
  }

  private applyBorderWidth(borderWidth: BorderWidth): void {
    this.borderWidth = borderWidth;
    this.path.setBorderWidth(borderWidth);
  }


  getIntersectionPoints(segment: Line): Point[] {
    return this.getIntersectionPoints(segment); // REFACTOR infloop
  }

  updateMbr(): Mbr {
    const rect = this.path.getMbr();
    const textRect = this.textContainer.getMbr();
    rect.combine([textRect]);
    this.mbr = rect;
    return rect;
  }

  getMbr(): Mbr {
    return this.mbr.copy();
  }

  getPathMbr(): Mbr {
    return this.getPath().getMbr();
  }

  getNearestEdgePointTo(point: Point): Point {
    return this.path.getNearestEdgePointTo(point);
  }

  getDistanceToPoint(point: Point): number {
    const nearest = this.getNearestEdgePointTo(point);
    return point.getDistance(nearest);
  }

  isUnderPoint(point: Point, tolerance = 5): boolean {
    if (Shapes[this.shapeType].useMbrUnderPointer) {
      return this.mbr.isUnderPoint(point);
    }
    if (
      this.text.isEmpty() &&
      (this.backgroundOpacity === 0 ||
        (this.backgroundColor.type === "fixed" &&
          (this.backgroundColor.value === "none" ||
            this.backgroundColor.value === "transparent" ||
            this.backgroundColor.value === "")))
    ) {
      // If there's no text and no background (opacity 0 or color is 'none' or empty string), check only the path edges
      return this.path.isPointOverEdges(point, tolerance);
    } else {
      // Otherwise, use the original logic
      return (
        this.textContainer.isUnderPoint(point) || this.path.isUnderPoint(point)
      );
    }
  }

  isNearPoint(point: Point, distance: number): boolean {
    return distance > this.getDistanceToPoint(point);
  }

  isEnclosedOrCrossedBy(rect: Mbr): boolean {
    return (
      this.textContainer.isEnclosedOrCrossedBy(rect) ||
      this.path.isEnclosedOrCrossedBy(rect)
    );
  }

  isEnclosedBy(rect: Mbr): boolean {
    return this.text.isEnclosedBy(rect) || this.path.isEnclosedBy(rect);
  }

  isInView(rect: Mbr): boolean {
    return this.isEnclosedOrCrossedBy(rect);
  }

  getNormal(point: Point): GeometricNormal {
    return this.path.getNormal(point);
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    this.path.setBackgroundColor(resolveColor(this.backgroundColor, conf.theme, "background"));
    this.path.setBorderColor(resolveColor(this.borderColor, conf.theme, "foreground"));
    this.path.render(context);
    this.text.render(context);
    if (this.getLinkTo()) {
      const { top, right } = this.getMbr();
      this.linkTo.render(context, top, right, this.board.camera.getScale());
    }
  }

  getPaths(): Path | Paths {
    return this.path;
  }

  copyPaths(): Path | Paths {
    return this.path.copy();
  }

  isClosed(): boolean {
    return this.path instanceof Path && this.path.isClosed();
  }

  private initPath(): void {
    this.path = Shapes[this.shapeType].createPath(this.mbr);
    const isBPMN = this.shapeType.split("_").length > 1
    if (isBPMN) {
      this.borderWidth = this.path.getBorderWidth() || this.borderWidth;
      this.borderStyle = this.path.getBorderStyle() || this.borderStyle;
      this.backgroundColor =
        (this.path.getBackgroundColor() ? { type: "fixed", value: this.path.getBackgroundColor() } : this.backgroundColor);
      this.backgroundOpacity =
        this.path.getBackgroundOpacity() || this.backgroundOpacity;
      this.borderColor = (this.path.getBorderColor() ? { type: "fixed", value: this.path.getBorderColor() } : this.borderColor);
      this.borderOpacity = this.path.getBorderOpacity() || this.borderOpacity;
    }
    this.textContainer = Shapes[this.shapeType].textBounds.copy();
    this.text.setContainer(this.textContainer.copy());
    this.text.updateElement();
  }

  private transformPath(): void {
    this.path = Shapes[this.shapeType].createPath(this.mbr);
    this.textContainer = Shapes[this.shapeType].textBounds.copy();
    this.text.setContainer(this.textContainer.copy());
    this.textContainer.transform(this.transformation.toMatrix());
    /*
    const previous = this.transformation.previous.copy();
    console.log("previous", previous);
    previous.invert();
    console.log("inverted", previous);
    const delta = previous.multiplyByMatrix(
      this.transformation.toMatrix(),
    );
    console.log("matrix", this.transformation.getMatrixData());
    console.log("delta", delta);
    this.path.transform(delta);
    */
    this.path.transform(this.transformation.toMatrix());

    this.path.setBackgroundOpacity(this.backgroundOpacity);
    this.path.setBorderWidth(this.borderWidth);
    this.path.setBorderStyle(this.borderStyle);
    this.path.setBorderOpacity(this.borderOpacity);
  }

  getPath(): Path | Paths {
    return this.path.copy();
  }

  getSnapAnchorPoints(): Point[] {
    const anchorPoints = Shapes[this.shapeType].anchorPoints;
    const points: Point[] = [];
    for (const anchorPoint of anchorPoints) {
      points.push(anchorPoint.getTransformed(this.transformation.toMatrix()));
    }
    return points;
  }

  doResize(
    resizeType: ResizeType,
    pointer: Point,
    mbr: Mbr,
    opposite: Point,
    _startMbr: Mbr,
    timeStamp: number
  ): { matrix: Matrix; mbr: Mbr } {
    const res = getResize(resizeType, pointer, mbr, opposite);

    this.apply(transformOps.applyMatrix(this.id, {
      translateX: res.matrix.translateX,
      translateY: res.matrix.translateY,
      scaleX: res.matrix.scaleX,
      scaleY: res.matrix.scaleY,
      shearX: 0,
      shearY: 0,
    }, timeStamp));

    res.mbr = this.getMbr();
    return res;
  }

  getRichText(): RichText {
    return this.text;
  }

  getIsShapeWithText(): boolean {
    return !(
      this.textContainer.top === this.textContainer.bottom &&
      this.textContainer.right === this.textContainer.left
    );
  }

  getIsBorderStyleEditable(): boolean {
    switch (this.shapeType.split("_")[0]) {
      case "BPMN":
        return false;
    }
    return true;
  }
}
