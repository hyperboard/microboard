import type { Canvas2DGeometryIRContext } from "canvas2d-geometry-ir";
import { DrawingContext } from "Geometry/DrawingContext";
import { GeometricNormal } from "Geometry/GeometricNormal";
import { Line } from "Geometry/Line/Line";
import { Mbr } from "Geometry/Mbr/Mbr";
import { Path, Paths } from "Geometry/Path";
import { Point } from "Geometry/Point";
import { BaseItem } from "./BaseItem";
import { UpdateHint } from "./UpdateHint";
import type { Operation } from "Events/EventsOperations";
import { CanvasIRPath } from "Geometry/Path/CanvasIRPath";

export abstract class CanvasIRItem<T extends BaseItem<any> = any> extends BaseItem<T> {
  private canvasIRPath?: CanvasIRPath;

  protected abstract renderToCanvasIR(ctx: Canvas2DGeometryIRContext): void;

  protected buildCanvasIRPath(): CanvasIRPath {
    const path = new CanvasIRPath((ctx) => this.renderToCanvasIR(ctx));
    path.transform(this.transformation.toMatrix());
    return path;
  }

  protected rebuildCanvasIRPath(): CanvasIRPath {
    this.canvasIRPath = this.buildCanvasIRPath();
    this.mbr = this.canvasIRPath.getMbr();
    return this.canvasIRPath;
  }

  protected getCanvasIRPath(): CanvasIRPath {
    return this.canvasIRPath ?? this.rebuildCanvasIRPath();
  }

  override getMbr(): Mbr {
    return this.getCanvasIRPath().getMbr();
  }

  override getPath(): Path | Paths {
    return this.getCanvasIRPath().copy();
  }

  override getPathMbr(): Mbr {
    return this.getCanvasIRPath().getMbr();
  }

  override getIntersectionPoints(segment: Line): Point[] {
    const parentMatrix = this.getParentWorldMatrix();
    const parentSegment = new Line(
      segment.start.getTransformed(parentMatrix.getInverse()),
      segment.end.getTransformed(parentMatrix.getInverse())
    );
    return this.getCanvasIRPath()
      .getIntersectionPoints(parentSegment)
      .map((point) => point.getTransformed(parentMatrix));
  }

  override getNearestEdgePointTo(point: Point): Point {
    const parentMatrix = this.getParentWorldMatrix();
    const parentPoint = point.getTransformed(parentMatrix.getInverse());
    const nearest = this.getCanvasIRPath().getNearestEdgePointTo(parentPoint);
    return nearest.getTransformed(parentMatrix);
  }

  override getDistanceToPoint(point: Point): number {
    return point.getDistance(this.getNearestEdgePointTo(point));
  }

  override isUnderPoint(point: Point): boolean {
    const parentMatrix = this.getParentWorldMatrix();
    const parentPoint = point.getTransformed(parentMatrix.getInverse());
    return this.getCanvasIRPath().isUnderPoint(parentPoint);
  }

  override isNearPoint(point: Point, distance: number): boolean {
    return this.getDistanceToPoint(point) < distance;
  }

  override isEnclosedOrCrossedBy(rect: Mbr): boolean {
    const parentRect = rect.getTransformed(this.getParentWorldMatrix().getInverse());
    return this.getCanvasIRPath().isEnclosedOrCrossedBy(parentRect);
  }

  override isEnclosedBy(rect: Mbr): boolean {
    const parentRect = rect.getTransformed(this.getParentWorldMatrix().getInverse());
    return this.getCanvasIRPath().isEnclosedBy(parentRect);
  }

  override isInView(rect: Mbr): boolean {
    return this.isEnclosedOrCrossedBy(rect);
  }

  override getNormal(point: Point): GeometricNormal {
    const parentMatrix = this.getParentWorldMatrix();
    const parentPoint = point.getTransformed(parentMatrix.getInverse());
    const normal = this.getCanvasIRPath().getNormal(parentPoint);
    return new GeometricNormal(
      normal.point.getTransformed(parentMatrix),
      normal.projectionPoint.getTransformed(parentMatrix),
      normal.normalPoint.getTransformed(parentMatrix),
    );
  }

  override render(context: DrawingContext): void {
    this.getCanvasIRPath().render(context);
    super.render(context);
  }

  protected override updateVisuals(_op: Operation, _hint: UpdateHint): void {
    this.rebuildCanvasIRPath();
    this.subject.publish(this as unknown as T);
  }
}
