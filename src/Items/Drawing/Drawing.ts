import type { Events, Operation } from "Events";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Line } from "../Line/Line";
import { Mbr } from "../Mbr/Mbr";
import { Path, scalePatterns } from "../Path/Path";
import type { BorderStyle, BorderWidth } from "../Path/Path";
import { Point } from "../Point/Point";
import { Transformation } from "../Transformation/Transformation";
import { DrawingCommand } from "./DrawingCommand";
import { DrawingOperation } from "./DrawingOperation";
import { TransformationData } from "../Transformation/TransformationData";
import { Geometry } from "../Geometry";
import { isSafari } from "isSafari";
import { LinkTo } from "../LinkTo/LinkTo";
import { conf } from "Settings";
import { Board } from "Board";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import { registerItem } from "../RegisterItem";
import { DrawingDataSchema } from "./Drawing.schema";
import { ColorValue, ColorRole, coerceColorValue, resolveColor, semanticColor } from "Color";

export interface DrawingData {
  itemType: "Drawing";
  points: { x: number; y: number }[];
  transformation: TransformationData;
  strokeStyle: ColorValue | string; // string for legacy deserialization
  strokeWidth: number;
  colorRole?: ColorRole; // 'foreground' for pen (default), 'background' for highlighter
  linkTo?: string;
  [key: string]: unknown;
}

export class Drawing extends BaseItem<Drawing> {
  readonly itemType = "Drawing";
  parent = "Board";
  private path2d = new conf.path2DFactory();
  readonly subject = new Subject<Drawing>();
  untransformedMbr = new Mbr();
  private lines: Line[] = [];
  strokeWidth: BorderWidth = 1;
  borderColor: ColorValue = semanticColor('contrastNeutral');
  borderStyle: BorderStyle = "solid";
  colorRole: ColorRole = 'foreground';
  private linePattern = scalePatterns(this.strokeWidth)[this.borderStyle];
  private borderOpacity = 1;
  transformationRenderBlock?: boolean = undefined;

  public points: Point[] = [];

  constructor(
    board: Board,
    id = "",
  ) {
    super(board, id);
    this.updateLines();
  }

  serialize(): SerializedItemData<DrawingData> {
    this.optimizePoints();
    const points: { x: number; y: number }[] = [];
    for (const point of this.points) {
      points.push({ x: point.x, y: point.y });
    }
    return {
      id: this.id,
      itemType: "Drawing",
      points,
      transformation: this.transformation.serialize(),
      strokeStyle: this.borderColor as ColorValue,
      strokeWidth: this.strokeWidth,
      colorRole: this.colorRole,
      linkTo: this.linkTo.serialize(),
    };
  }

  deserialize(data: SerializedItemData<DrawingData> | DrawingData): this {
    this.points = [];
    for (const point of data.points) {
      this.points.push(new Point(point.x, point.y));
    }
    this.linkTo.deserialize(data.linkTo);
    this.optimizePoints();
    this.transformation.deserialize(data.transformation);
    this.borderColor = coerceColorValue(
      data.strokeStyle as string | ColorValue
    );
    this.updateLines();
    this.updateMbr();
    this.strokeWidth = data.strokeWidth;
    if (data.colorRole) {
      this.colorRole = data.colorRole;
    }
    this.updateGeometry();
    return this;
  }

  updateGeometry(): void {
    this.updatePath2d();
    this.updateLines();
    this.updateMbr();
  }

  updateMbr(): void {
    /*
    const width = this.untransformedMbr.getWidth();
    const height = this.untransformedMbr.getHeight();
    this.left =
      this.untransformedMbr.left + this.transformation.matrix.translateX;
    this.top =
      this.untransformedMbr.top + this.transformation.matrix.translateY;
    this.right = this.left + width * this.transformation.matrix.scaleX;
    this.bottom = this.top + height * this.transformation.matrix.scaleY;
    */
    const offset = this.getStrokeWidth() / 2;
    const untransformedMbr = this.untransformedMbr.copy();
    untransformedMbr.left -= offset;
    untransformedMbr.top -= offset;
    untransformedMbr.right += offset;
    untransformedMbr.bottom += offset;

    const mbr = untransformedMbr.getTransformed(this.transformation.toMatrix());

    this.mbr.left = mbr.left;
    this.mbr.top = mbr.top;
    this.mbr.right = mbr.right;
    this.mbr.bottom = mbr.bottom;
  }

  updatePath2d(): void {
    this.path2d = new conf.path2DFactory();
    const context = this.path2d;
    const points = this.points;
    if (points.length < 3) {
      context.arc(points[0].x, points[0].y, 0.5, 0, Math.PI * 2, true);
      context.closePath();
    } else {
      context.moveTo(points[0].x, points[0].y);

      let j = 1;

      for (; j < points.length - 2; j++) {
        const cx = (points[j].x + points[j + 1].x) / 2;
        const cy = (points[j].y + points[j + 1].y) / 2;
        context.quadraticCurveTo(points[j].x, points[j].y, cx, cy);
      }

      const x =
        points[j].x === points[j + 1].x && isSafari()
          ? points[j + 1].x + 0.01
          : points[j + 1].x;
      const y =
        points[j].y === points[j + 1].y && isSafari()
          ? points[j + 1].y + 0.01
          : points[j + 1].y;

      context.quadraticCurveTo(points[j].x, points[j].y, x, y);
    }

    let left = Number.MAX_SAFE_INTEGER;
    let right = Number.MIN_SAFE_INTEGER;
    let top = Number.MAX_SAFE_INTEGER;
    let bottom = Number.MIN_SAFE_INTEGER;

    for (const { x, y } of this.points) {
      if (x < left) {
        left = x;
      }
      if (x > right) {
        right = x;
      }
      if (y < top) {
        top = y;
      }
      if (y > bottom) {
        bottom = y;
      }
    }

    this.untransformedMbr = new Mbr(left, top, right, bottom);
  }

  updateLines(): void {
    this.lines = [];
    const matrix = this.transformation.toMatrix();
    if (this.points.length < 2) {
      return;
    }
    for (let i = 0; i < this.points.length - 2; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const line = new Line(p1.copy(), p2.copy());
      line.transform(matrix);
      this.lines.push(line);
    }
  }

  optimizePoints(): void {
    const dp = douglasPeucker(this.points, 1);
    // const dp = rdpWithDistanceThreshold(this.points, 1);
    dp.push(this.points[this.points.length - 1]);
    this.points = dp;
  }

  addPoint(point: Point): void {
    const previous = this.points[this.points.length - 1];
    if (previous) {
      const distance = point.getDistance(previous);
      if (distance >= 2) {
        // adjust this threshold as needed
        this.points.push(point);
      }
    } else {
      this.points.push(point);
    }
    this.updateGeometry();
  }

  setId(id: string): this {
    this.id = id;
    this.transformation.setId(id);
    this.linkTo.setId(id);
    return this;
  }

  getId(): string {
    return this.id;
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    const ctx = context.ctx;
    ctx.save();
    ctx.strokeStyle = resolveColor(this.borderColor, conf.theme, this.colorRole);
    ctx.globalAlpha = this.borderOpacity;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = "round";
    ctx.setLineDash(this.linePattern);
    this.transformation.applyToContext(ctx);
    ctx.stroke(this.path2d.nativePath as Path2D);
    ctx.restore();
    if (this.getLinkTo()) {
      const { top, right } = this.getMbr();
      this.linkTo.render(context, top, right, this.board.camera.getScale());
    }
  }


  private getPathData(): string {
    const points = this.points;
    if (points.length < 2) {
      return "";
    }

    let pathData = `M ${points[0].x} ${points[0].y}`;

    if (points.length < 3) {
      pathData += ` L ${points[0].x + 0.5} ${points[0].y}`;
    } else {
      let j = 1;
      for (; j < points.length - 2; j++) {
        const cx = (points[j].x + points[j + 1].x) / 2;
        const cy = (points[j].y + points[j + 1].y) / 2;
        pathData += ` Q ${points[j].x} ${points[j].y} ${cx} ${cy}`;
      }

      const x =
        points[j].x === points[j + 1].x && isSafari()
          ? points[j + 1].x + 0.01
          : points[j + 1].x;
      const y =
        points[j].y === points[j + 1].y && isSafari()
          ? points[j + 1].y + 0.01
          : points[j + 1].y;

      pathData += ` Q ${points[j].x} ${points[j].y} ${x} ${y}`;
    }

    return pathData;
  }

  getPath(): Path {
    const { left, top, right, bottom } = this.getMbr();
    const leftTop = new Point(left, top);
    const rightTop = new Point(right, top);
    const rightBottom = new Point(right, bottom);
    const leftBottom = new Point(left, bottom);
    return new Path(
      [
        new Line(leftTop, rightTop),
        new Line(rightTop, rightBottom),
        new Line(rightBottom, leftBottom),
        new Line(leftBottom, leftTop),
      ],
      true
    );
  }

  getSnapAnchorPoints(): Point[] {
    const mbr = this.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    return [
      new Point(mbr.left + width / 2, mbr.top),
      new Point(mbr.left + width / 2, mbr.bottom),
      new Point(mbr.left, mbr.top + height / 2),
      new Point(mbr.right, mbr.top + height / 2),
    ];
  }

  getLines(): Line[] {
    return this.lines;
  }

  isClosed(): boolean {
    return true;
  }

  isNearPoint(point: Point, distance: number): boolean {
    return this.isPointNearLine(point, distance);
  }

  getDistanceToPoint(point: Point): number {
    // We don't have a direct "perpendicular distance to all lines" helper that returns a number,
    // but isPointNearLine checks a threshold. For a general distance, we'd need to iterate.
    // Since tools usually check a threshold, isNearPoint is more useful.
    // Fallback to MBR distance if needed, but isNearPoint is overridden.
    return super.getDistanceToPoint(point);
  }

  intersectsWithLines(lines: Line[]): boolean {
    return this.lines.some((line) => {
      return lines.some((segment) => segment.hasIntersectionPoint(line));
    });
  }

  isEnclosedOrCrossedBy(rect: Mbr): boolean {
    for (const line of this.lines) {
      if (line.isEnclosedOrCrossedBy(rect)) {
        return true;
      }
    }
    return false;
  }

  emit(operation: DrawingOperation): void {
    if (this.board.events) {
      const command = new DrawingCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
    } else {
      this.apply(operation);
    }
  }

  apply(op: Operation): void {
    if (op.method === "setProperty") {
      super.apply(op);
      return;
    }
    switch (op.class) {
      case "LinkTo":
        this.linkTo.apply(op as any);
        break;
      case "Transformation":
        super.apply(op);
        this.updateMbr();
        this.updateLines();
        break;
      default:
        super.apply(op);
        return;
    }
    this.subject.publish(this);
  }

  protected onPropertyUpdated(property: string, value: unknown, prevValue: unknown): void {
    if (["strokeWidth", "borderStyle"].includes(property)) {
      this.linePattern = scalePatterns(this.strokeWidth)[this.borderStyle];
    }
    if (["borderColor", "strokeWidth", "borderOpacity", "borderStyle"].includes(property)) {
      this.updateMbr();
      this.subject.publish(this);
    }
  }


  getStrokeOpacity(): number {
    return this.borderOpacity;
  }


  getBorderStyle(): BorderStyle {
    return this.borderStyle;
  }


  getStrokeColor(): ColorValue {
    return this.borderColor;
  }

  setColorRole(role: ColorRole): this {
    this.colorRole = role;
    return this;
  }

  getColorRole(): ColorRole {
    return this.colorRole;
  }


  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  getStrokeWidth(): BorderWidth {
    return this.strokeWidth;
  }

  getRichText(): null {
    return null;
  }



  isPointNearLine(point: Point, threshold: number | undefined = 10): boolean {
    // Use world matrix so nested drawings (inside a Frame) are handled correctly.
    const { translateX: drawingTranslateX, translateY: drawingTranslateY, scaleX: drawingScaleX, scaleY: drawingScaleY } = this.getWorldMatrix();
    const transformedMouseX =
      (point.x - drawingTranslateX) /
      drawingScaleX;
    const transformedMouseY =
      (point.y - drawingTranslateY) /
      drawingScaleY;
    const transformedMouse = new Point(transformedMouseX, transformedMouseY);
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];

      const distance = getPerpendicularDistance(transformedMouse, p1, p2);

      if (distance < threshold) {
        return true;
      }
    }
    return false;
  }
}

registerItem({
  item: Drawing,
  defaultData: {
    itemType: "Drawing",
    points: [],
    borderColor: coerceColorValue("#000000"),
    borderOpacity: 1,
    borderStyle: "solid",
    strokeWidth: 2,
    transformation: new DefaultTransformationData(),
  } as any,
  schema: DrawingDataSchema,
});

function getPerpendicularDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const { x: px, y: py } = point;
  const { x: sx, y: sy } = lineStart;
  const { x: ex, y: ey } = lineEnd;

  const numerator = Math.abs(
    (ey - sy) * px - (ex - sx) * py + ex * sy - ey * sx
  );
  const denominator = Math.sqrt(Math.pow(ey - sy, 2) + Math.pow(ex - sx, 2));
  return numerator / denominator;
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) {
    return points;
  }

  const start = points[0];
  const end = points[points.length - 1];
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = getPerpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    const leftSubPoints = points.slice(0, maxIndex + 1);
    const rightSubPoints = points.slice(maxIndex);
    const leftRecursiveResult = douglasPeucker(leftSubPoints, epsilon);
    const rightRecursiveResult = douglasPeucker(rightSubPoints, epsilon);
    // Add the last point of the left subarray if it's not part of a straight line
    // if (leftSubPoints[leftSubPoints.length - 1] !== rightSubPoints[0]) {
    // 	leftRecursiveResult.push(rightSubPoints[0]);
    // }
    return leftRecursiveResult.slice(0, -1).concat(rightRecursiveResult);
  } else {
    return [start, end];
  }
}
