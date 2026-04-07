import {
  Canvas2DGeometryIRContext,
  GeometryEngine,
  drawOpToSvgPathData,
  replayDocument,
  type CanvasLikeReplayTarget,
  type GeometryDocument,
} from "canvas2d-geometry-ir";
import { DrawingContext } from "Geometry/DrawingContext";
import { GeometricNormal } from "Geometry/GeometricNormal";
import { Line } from "Geometry/Line/Line";
import { Mbr } from "Geometry/Mbr/Mbr";
import { Path, type BorderStyle, type BorderWidth, scalePatterns } from "Geometry/Path/Path";
import { Point } from "Geometry/Point/Point";
import { Matrix } from "Geometry/Transformation/Matrix";

type CanvasIRDefinition = (ctx: Canvas2DGeometryIRContext) => void;

class NativeCanvasReplayTarget implements CanvasLikeReplayTarget {
  constructor(private readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {}

  beginPath(): void {
    this.ctx.beginPath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    this.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }

  closePath(): void {
    this.ctx.closePath();
  }

  fill(fillRule?: "nonzero" | "evenodd"): void {
    this.ctx.fill(fillRule);
  }

  stroke(): void {
    this.ctx.stroke();
  }

  setFillStyle(value: string): void {
    this.ctx.fillStyle = value;
  }

  setStrokeStyle(value: string): void {
    this.ctx.strokeStyle = value;
  }

  setLineWidth(value: number): void {
    this.ctx.lineWidth = value;
  }

  setLineDash(value: readonly number[]): void {
    this.ctx.setLineDash([...value]);
  }

  setLineCap(value: "butt" | "round" | "square"): void {
    this.ctx.lineCap = value;
  }

  setLineJoin(value: "miter" | "round" | "bevel"): void {
    this.ctx.lineJoin = value;
  }

  setMiterLimit(value: number): void {
    this.ctx.miterLimit = value;
  }

  setGlobalAlpha(value: number): void {
    this.ctx.globalAlpha = value;
  }
}

const toIRMatrix = (matrix: Matrix) => {
  const affine = matrix.getAffineMatrix();
  return [affine.a, affine.b, affine.c, affine.d, affine.e, affine.f] as const;
};

const createRectangleDocument = (rect: Mbr): GeometryDocument => {
  const ctx = new Canvas2DGeometryIRContext();
  ctx.beginPath();
  ctx.moveTo(rect.left, rect.top);
  ctx.lineTo(rect.right, rect.top);
  ctx.lineTo(rect.right, rect.bottom);
  ctx.lineTo(rect.left, rect.bottom);
  ctx.closePath();
  ctx.stroke();
  return ctx.getDocument();
};

const mergeDocuments = (first: GeometryDocument, second: GeometryDocument): GeometryDocument => {
  return {
    version: 1,
    drawOps: [
      ...first.drawOps,
      ...second.drawOps.map((op, index) => ({
        ...op,
        opId: `external-${index}`,
      })),
    ],
  };
};

export class CanvasIRPath extends Path {
  private backgroundColorValue: string;
  private borderColorValue: string;
  private borderStyleValue: BorderStyle;
  private borderWidthValue: BorderWidth;
  private backgroundOpacityValue: number;
  private borderOpacityValue: number;
  private transformMatrix = new Matrix();
  private document: GeometryDocument;
  private engine: GeometryEngine;
  private cachedMbr: Mbr;

  constructor(
    private readonly definition: CanvasIRDefinition,
    {
      backgroundColor = "none",
      borderColor = "black",
      borderStyle = "solid" as BorderStyle,
      borderWidth = 1 as BorderWidth,
      backgroundOpacity = 1,
      borderOpacity = 1,
      transformMatrix,
    }: {
      backgroundColor?: string;
      borderColor?: string;
      borderStyle?: BorderStyle;
      borderWidth?: BorderWidth;
      backgroundOpacity?: number;
      borderOpacity?: number;
      transformMatrix?: Matrix;
    } = {}
  ) {
    super([new Line(new Point(0, 0), new Point(1, 0))], false);
    this.backgroundColorValue = backgroundColor;
    this.borderColorValue = borderColor;
    this.borderStyleValue = borderStyle;
    this.borderWidthValue = borderWidth;
    this.backgroundOpacityValue = backgroundOpacity;
    this.borderOpacityValue = borderOpacity;
    if (transformMatrix) {
      this.transformMatrix = transformMatrix.copy();
    }
    this.document = { version: 1, drawOps: [] };
    this.engine = new GeometryEngine(this.document);
    this.cachedMbr = new Mbr(0, 0, 0, 0);
    this.rebuild();
  }

  override getBackgroundColor(): string {
    return this.backgroundColorValue;
  }

  override getBorderColor(): string {
    return this.borderColorValue;
  }

  override getBorderStyle(): BorderStyle {
    return this.borderStyleValue;
  }

  override getBorderWidth(): BorderWidth {
    return this.borderWidthValue;
  }

  override setBackgroundColor(color: string): void {
    this.backgroundColorValue = color;
  }

  override setBorderColor(color: string): void {
    this.borderColorValue = color;
  }

  override setBorderStyle(style: BorderStyle): void {
    this.borderStyleValue = style;
  }

  override setBorderWidth(width: number): void {
    this.borderWidthValue = width as BorderWidth;
    this.rebuild();
  }

  override getBackgroundOpacity(): number {
    return this.backgroundOpacityValue;
  }

  override setBackgroundOpacity(opacity: number): void {
    this.backgroundOpacityValue = opacity;
  }

  override getBorderOpacity(): number {
    return this.borderOpacityValue;
  }

  override setBorderOpacity(opacity: number): void {
    this.borderOpacityValue = opacity;
  }

  override getIntersectionPoints(segment: Line): Point[] {
    const start = segment.getStartPoint();
    const end = segment.getEndPoint();
    const externalCtx = new Canvas2DGeometryIRContext();
    externalCtx.beginPath();
    externalCtx.moveTo(start.x, start.y);
    externalCtx.lineTo(end.x, end.y);
    externalCtx.stroke();
    const engine = new GeometryEngine(mergeDocuments(this.document, externalCtx.getDocument()));
    const intersections: Point[] = [];
    for (const op of this.document.drawOps) {
      intersections.push(
        ...engine
          .getPathIntersections(op.opId, "external-0")
          .map((point) => new Point(point.x, point.y))
      );
    }
    return intersections;
  }

  override getNearestEdgePointTo(point: Point): Point {
    const closest = this.engine.closestPoint({ x: point.x, y: point.y });
    if (!closest) {
      return point.copy();
    }
    return new Point(closest.point.x, closest.point.y);
  }

  override getDistanceToPoint(point: Point): number {
    return point.getDistance(this.getNearestEdgePointTo(point));
  }

  override isUnderPoint(point: Point): boolean {
    return this.engine.hitTestPoint({ x: point.x, y: point.y }).length > 0;
  }

  override isPointOverEdges(point: Point, tolerance = 5): boolean {
    const closest = this.engine.closestPoint({ x: point.x, y: point.y });
    return !!closest && closest.distance <= tolerance;
  }

  override isNearPoint(point: Point, distance: number): boolean {
    return this.getDistanceToPoint(point) < distance;
  }

  override getMbr(): Mbr {
    return this.cachedMbr ? this.cachedMbr.copy() : new Mbr(0, 0, 0, 0);
  }

  override isEnclosedOrCrossedBy(rect: Mbr): boolean {
    return this.engine.queryRect({
      minX: rect.left,
      minY: rect.top,
      maxX: rect.right,
      maxY: rect.bottom,
    }).some((result) => result.intersects || result.containsRect || result.enclosedByRect);
  }

  override isEnclosedBy(rect: Mbr): boolean {
    return this.engine.queryRect({
      minX: rect.left,
      minY: rect.top,
      maxX: rect.right,
      maxY: rect.bottom,
    }).some((result) => result.enclosedByRect);
  }

  override isInView(rect: Mbr): boolean {
    return this.isEnclosedOrCrossedBy(rect);
  }

  override getNormal(point: Point): GeometricNormal {
    const closest = this.engine.closestPoint({ x: point.x, y: point.y });
    if (!closest) {
      return new GeometricNormal(point.copy(), point.copy(), new Point(1, 0));
    }
    return new GeometricNormal(
      point.copy(),
      new Point(closest.point.x, closest.point.y),
      new Point(closest.normal.x, closest.normal.y)
    );
  }

  override render(context: DrawingContext): void {
    const scale = context.getCameraScale();
    const mbr = this.getMbr();
    const maxDimension = Math.max(mbr.getWidth() * scale, mbr.getHeight() * scale);
    if (maxDimension < context.rectangleVisibilyTreshold) {
      return;
    }
    const shouldFillBackground =
      this.backgroundColorValue !== "none" &&
      this.backgroundColorValue !== "" &&
      this.backgroundOpacityValue > 0;
    const ctx = context.ctx;
    if (maxDimension < context.shapeVisibilityTreshold) {
      if (shouldFillBackground) {
        ctx.save();
        ctx.globalAlpha = this.backgroundOpacityValue;
        ctx.fillStyle = this.backgroundColorValue;
        ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());
        ctx.restore();
      }
      return;
    }
    ctx.save();
    ctx.setLineDash(scalePatterns(this.borderWidthValue)[this.borderStyleValue]);
    const target = new NativeCanvasReplayTarget(ctx);
    for (const op of this.document.drawOps) {
      if (op.paint === "fill") {
        if (!shouldFillBackground) {
          continue;
        }
        ctx.globalAlpha = this.backgroundOpacityValue;
        ctx.fillStyle = this.backgroundColorValue;
      } else {
        if (
          context.isBorderInvisible ||
          this.borderColorValue === "transparent" ||
          this.borderColorValue === "none" ||
          !this.borderColorValue ||
          this.borderOpacityValue <= 0
        ) {
          continue;
        }
        ctx.globalAlpha = this.borderOpacityValue;
        ctx.strokeStyle = this.borderColorValue;
        ctx.lineWidth = this.borderWidthValue;
      }
      replayDocument({ version: 1, drawOps: [op] }, target);
    }
    ctx.restore();
  }

  override transform(matrix: Matrix): void {
    this.transformMatrix.multiply(matrix);
    this.rebuild();
  }

  override getTransformed(matrix: Matrix): Path {
    const next = this.copy() as CanvasIRPath;
    next.transform(matrix);
    return next;
  }

  override copy(): Path {
    return new CanvasIRPath(this.definition, {
      backgroundColor: this.backgroundColorValue,
      borderColor: this.borderColorValue,
      borderStyle: this.borderStyleValue,
      borderWidth: this.borderWidthValue,
      backgroundOpacity: this.backgroundOpacityValue,
      borderOpacity: this.borderOpacityValue,
      transformMatrix: this.transformMatrix.copy(),
    });
  }

  override getSvgPath(): string {
    return this.document.drawOps.map(drawOpToSvgPathData).join(" ");
  }

  private rebuild(): void {
    const ctx = new Canvas2DGeometryIRContext();
    const [a, b, c, d, e, f] = toIRMatrix(this.transformMatrix);
    ctx.setTransform(a, b, c, d, e, f);
    ctx.lineWidth = this.borderWidthValue;
    this.definition(ctx);
    this.document = ctx.getDocument();
    this.engine = new GeometryEngine(this.document);
    this.cachedMbr = this.computeMbr();
  }

  private computeMbr(): Mbr {
    const bounds = this.engine.getPaintBounds();
    if (!bounds) {
      return new Mbr(0, 0, 0, 0);
    }
    return new Mbr(
      bounds.minX,
      bounds.minY,
      bounds.maxX,
      bounds.maxY
    );
  }
}

export const createCanvasIRPath = (definition: CanvasIRDefinition): CanvasIRPath => {
  return new CanvasIRPath(definition);
};
