import { Operation } from "Events";
import { Subject } from "Subject";
import { Line } from "../Line/Line";
import { Matrix } from "../Transformation/Matrix";
import { Mbr } from "../Mbr/Mbr";
import { Path } from "../Path/Path";
import { Paths } from "../Path/Paths";
import { Point } from "../Point/Point";
import { Transformation } from "../Transformation/Transformation";
import type { TransformationOperation } from "../Transformation/TransformationOperations";
import { getProportionalResize } from "../../Selection/Transformer/TransformerHelpers/getResizeMatrix";
import { ResizeType } from "../../Selection/Transformer/TransformerHelpers/getResizeType";
import { DrawingContext } from "../DrawingContext";
import { GeometricNormal } from "../GeometricNormal";
import { Geometry } from "../Geometry";
import { RichText } from "../RichText/RichText";
import { StickerCommand } from "./StickerCommand";
import { StickerData, StickerOperation } from "./StickerOperation";
import { LinkTo } from "../LinkTo/LinkTo";
import { SessionStorage } from "SessionStorage";
import { Board } from "Board";
import { transformOps } from "../Transformation/transformOps";
import { conf } from "Settings";
import { BaseItem } from "../BaseItem/BaseItem";
import type { SerializedItemData } from "../BaseItem/BaseItem";
import { ColorValue, coerceColorValue, resolveColor } from "Color";
import type { LinkToOperation } from "../LinkTo/LinkToOperation";
import { getTextResizeType } from "Selection/Transformer/TextTransformer/getTextResizeType";

export const stickerColors = {
  Purple: "rgb(233, 208, 255)",
  Pink: "rgb(255, 209, 211)",
  "Sky Blue": "rgb(206, 228, 255)",
  Blue: "rgb(205, 250, 255)",
  Green: "rgb(203, 232, 150)",
  "Light Green": "rgb(180, 241, 198)",
  Orange: "rgb(255, 180, 126)",
  Yellow: "rgb(255, 235, 163)",
  "Light Gray": "rgb(231, 232, 238)",
  Gray: "rgb(156, 156, 156)",
} as { [color: string]: string };

const width = 200;
const height = 200;

export const StickerShape = {
  textBounds: new Mbr(8, 8, width - 8, height - 8),
  stickerPath: new Path(
    [
      new Line(new Point(0, 0), new Point(width, 0)),
      new Line(new Point(width, 0), new Point(width, height)),
      new Line(new Point(width, height), new Point(0, height)),
      new Line(new Point(0, height), new Point(0, 0)),
    ],
    true,
    stickerColors["Sky Blue"],
    "transparent",
    "solid",
    0
  ),
  anchorPoints: [
    new Point(width / 2, 0),
    new Point(width, height / 2),
    new Point(width / 2, height),
    new Point(0, height / 2),
  ],
  DEFAULTS: [width, height],
};

const defaultStickerData = new StickerData();
const _hypotenuse = Math.sqrt(height * height + width * width);
const _relation = width / height;

export class Sticker extends BaseItem<Sticker> {
  parent = "Board";
  readonly itemType = "Sticker";
  private stickerPath = StickerShape.stickerPath.copy();
  private textContainer = StickerShape.textBounds.copy();
  text: RichText;
  readonly subject = new Subject<Sticker>();
  transformationRenderBlock?: boolean = undefined;

  constructor(
    board: Board,
    id = "",
    public backgroundColor = defaultStickerData.backgroundColor
  ) {
    super(board, id);
    this.text = new RichText(
      board,
      this.textContainer,
      this.id,
      this.transformation,
      this.linkTo,
      "\u00A0",
      false,
      true,
      this.itemType
    );


    this.text.subject.subscribe(() => {
      this.subject.publish(this);
    });
    this.linkTo.subject.subscribe(() => {
      this.transformPath();
      this.subject.publish(this);
    });
    this.text.updateElement();
    this.transformPath();
    this.subject.publish(this);
  }

  emit(operation: StickerOperation): void {
    if (this.board.events) {
      const command = new StickerCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
    } else {
      this.apply(operation);
    }
  }

  saveStickerData() {
    const storage = new SessionStorage();
    storage.setStickerData(this.serialize());
  }

  serialize(): SerializedItemData<StickerData> {
    return {
      id: this.id,
      itemType: "Sticker",
      backgroundColor: this.backgroundColor,
      transformation: this.transformation.serialize(),
      text: this.text.serialize(),
      linkTo: this.linkTo.serialize(),
    };
  }

  deserialize(data: SerializedItemData<StickerData> | StickerData): this {
    if (data.backgroundColor != null) {
      this.backgroundColor = coerceColorValue(data.backgroundColor);
    }
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
    this.text.updateElement();
    const linkTo = data.linkTo;
    if (linkTo) {
      this.linkTo.deserialize(linkTo);
    }
    // this.transformPath();
    this.subject.publish(this);
    return this;
  }

  private transformPath(): void {
    if (conf.isNode()) {
      return;
    }
    this.stickerPath = StickerShape.stickerPath.copy();
    this.textContainer = StickerShape.textBounds.copy();
    this.stickerPath.transform(this.transformation.toMatrix());
    this.text.setContainer(this.textContainer.copy());
    this.textContainer.transform(this.transformation.toMatrix());
    // this.text.setContainer(this.textContainer);
    this.saveStickerData();
  }

  setId(id: string): this {
    this.id = id;
    this.text.setId(id);
    this.linkTo.setId(id);
    this.transformation.setId(id);
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
      case "Transformation": {
        super.apply(op);
        this.transformPath();
        const transformOp = op as TransformationOperation;
        if (transformOp.method === "applyMatrix") {
          const itemOp = transformOp.items.find((i) => i.id === this.id);
          if (itemOp) {
            const prevScaleX = this.transformation.previous.scaleX;
            const prevScaleY = this.transformation.previous.scaleY;
            const currentScaleX = this.transformation.getScale().x;
            const currentScaleY = this.transformation.getScale().y;

            // Only apply scale if actual scale changed (ignore translation/re-parenting pseudo-scales)
            const scaleChanged =
              Math.abs(currentScaleX - prevScaleX) > 0.0001 ||
              Math.abs(currentScaleY - prevScaleY) > 0.0001;

            if (scaleChanged) {
              if (this.text.isAutosize()) {
                if (Math.abs(currentScaleX - currentScaleY) > 0.0001) {
                  this.text.applyAutoSizeScale(this.text.calcAutoSize());
                } else {
                  this.text.scaleAutoSizeScale(currentScaleX / prevScaleX);
                }
                this.text.recoordinate();
                this.text.transformCanvas();
              } else {
                this.text.handleInshapeScale();
              }
            }
          }
        }
        break;
      }
      case "Sticker":
        this.applyStickerOperation(op as StickerOperation);
        break;
      case "RichText":
        this.text.apply(op);
        break;
      case "LinkTo":
        this.linkTo.apply(op as LinkToOperation);
        break;
    }
    this.subject.publish(this);
  }

  private applyStickerOperation(op: StickerOperation): void {
    switch (op.method) {
      case "setBackgroundColor":
        this.applyBackgroundColor(op.backgroundColor);
        break;
    }
  }

  getBackgroundColor(): ColorValue {
    return this.backgroundColor;
  }

  getWidth() {
    return this.stickerPath.getWidth();
  }

  private applyBackgroundColor(backgroundColor: ColorValue): void {
    this.backgroundColor = backgroundColor;
  }

  getIntersectionPoints(segment: Line): Point[] {
    throw new Error("Not implemented");
  }

  getMbr(): Mbr {
    const rect = this.stickerPath.getMbr();
    return rect;
  }

  getNearestEdgePointTo(point: Point): Point {
    return this.stickerPath.getNearestEdgePointTo(point);
  }

  getDistanceToPoint(point: Point): number {
    const nearest = this.getNearestEdgePointTo(point);
    return point.getDistance(nearest);
  }

  isUnderPoint(point: Point): boolean {
    return (
      this.textContainer.isUnderPoint(point) ||
      this.stickerPath.isUnderPoint(point)
    );
  }

  isNearPoint(point: Point, distance: number): boolean {
    return distance > this.getDistanceToPoint(point);
  }

  isEnclosedOrCrossedBy(rect: Mbr): boolean {
    return (
      this.textContainer.isEnclosedOrCrossedBy(rect) ||
      this.stickerPath.isEnclosedOrCrossedBy(rect)
    );
  }

  isEnclosedBy(rect: Mbr): boolean {
    return this.stickerPath.isEnclosedBy(rect);
  }

  isInView(rect: Mbr): boolean {
    return this.isEnclosedOrCrossedBy(rect);
  }

  getNormal(point: Point): GeometricNormal {
    return this.stickerPath.getNormal(point);
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    this.renderShadow(context);
    this.stickerPath.setBackgroundColor(resolveColor(this.backgroundColor, conf.theme, 'background'));
    this.stickerPath.render(context);
    this.text.render(context);
    if (this.getLinkTo()) {
      const { top, right } = this.getMbr();
      this.linkTo.render(context, top, right, this.board.camera.getScale());
    }
  }


  renderShadow(context: DrawingContext): void {
    const mbr = this.getMbr();
    const { ctx } = context;

    ctx.save();
    // First shadow
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY =
      (18 - 5) * context.getCameraScale() * this.transformation.getScale().y;
    ctx.shadowColor = "rgba(20, 21, 26, 0.25)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "rgba(20, 21, 26, 0.25)";
    ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());

    // Second shadow
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY =
      (8 - 5) * context.getCameraScale() * this.transformation.getScale().y;
    ctx.shadowColor = "rgba(20, 21, 26, 0.125)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(20, 21, 26, 0.125)";
    ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());

    ctx.restore();
  }

  getPaths(): Path | Paths {
    return this.stickerPath.copy();
  }

  isClosed(): boolean {
    return true;
  }

  getPath(): Path | Paths {
    const path = this.stickerPath.copy();
    path.setBackgroundColor("none");
    return path;
  }

  getSnapAnchorPoints(): Point[] {
    const anchorPoints = StickerShape.anchorPoints;
    const points: Point[] = [];
    for (const anchorPoint of anchorPoints) {
      points.push(anchorPoint.getTransformed(this.transformation.toMatrix()));
    }
    return points;
  }

  /** Entry point for AddSticker tool during item creation */
  applyDiagonal(line: Line) {
    const l = line.getLength() / _hypotenuse;
    let x = line.start.x;
    let y = line.start.y;
    if (line.end.x < line.start.x) {
      x -= l * width;
    }
    if (line.end.y < line.start.y) {
      y -= l * height;
    }

    this.apply(transformOps.setLocal(this.id, { translateX: x, translateY: y, scaleX: l, scaleY: l }));
    this.saveStickerData();
  }
  /** Entry point for AddSticker tool during item creation */
  applyTransformToCenter(pt: Point, newWidth?: number) {
    if (newWidth) {
      const scale = newWidth / width;

      const w = width * scale;
      const h = height * scale;

      this.apply(transformOps.setLocal(this.id, { translateX: pt.x - w / 2, translateY: pt.y - h / 2, scaleX: scale, scaleY: scale }));
    } else {
      this.apply(transformOps.setLocal(this.id, { translateX: pt.x - width / 2, translateY: pt.y - height / 2, scaleX: 1, scaleY: 1 }));
    }
  }
  doResize(
    resizeType: ResizeType,
    pointer: Point,
    mbr: Mbr,
    opposite: Point,
    startMbr: Mbr,
    timeStamp: number
  ): { matrix: Matrix; mbr: Mbr } {
    const res = getProportionalResize(resizeType, pointer, mbr, opposite);

    if (["left", "right"].indexOf(resizeType) > -1) {
      const d = startMbr.getWidth() / startMbr.getHeight();
      const originallySquared = d > 0.99 * _relation && d < 1.01 * _relation;
      const d3 = this.getMbr().getWidth() / this.getMbr().getHeight();
      const nowSquared = d3 > 0.99 * _relation && d3 < 1.01 * _relation;
      const growSquared = res.mbr.getWidth() < startMbr.getWidth();
      const shrinkSquared =
        res.mbr.getWidth() / startMbr.getMbr().getWidth() < 0.8;

      const needGrow =
        (originallySquared && !growSquared && nowSquared) ||
        (!originallySquared && !shrinkSquared && nowSquared);
      const needShrink =
        (originallySquared && growSquared && !nowSquared) ||
        (!originallySquared && shrinkSquared && !nowSquared);

      const startWidth = this.getMbr().getWidth();
      if (needGrow) {
        this.apply(transformOps.scaleBy(this.id, 1.33, 1, timeStamp));
        if (resizeType === "left") {
          this.apply(transformOps.translateBy(this.id,
            startWidth - this.getMbr().getWidth(),
            0,
            timeStamp
          ));
        }
      } else if (needShrink) {
        this.apply(transformOps.scaleBy(this.id, 1 / 1.33, 1, timeStamp));
        if (resizeType === "left") {
          this.apply(transformOps.translateBy(this.id,
            startWidth - this.getMbr().getWidth(),
            0,
            timeStamp
          ));
        }
      }
    } else {
      this.apply(transformOps.scaleByTranslateBy(this.id,
        {
          x: res.matrix.scaleX,
          y: res.matrix.scaleY,
        },
        {
          x: res.matrix.translateX,
          y: res.matrix.translateY,
        },
        timeStamp
      ));
    }
    res.mbr = this.getMbr();
    this.saveStickerData();

    return res;
  }

  getResizeType(
    point: Point,
    cameraScale: number,
    mbr: Mbr,
    anchorDistance = 5
  ): ResizeType | undefined {
    return getTextResizeType(point, cameraScale, mbr, anchorDistance);
  }

  getRichText(): RichText {
    return this.text;
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }
}
