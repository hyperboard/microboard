import { Mbr } from "./Mbr";
import { Point } from "./Point";
import { Line } from "./Line";
import { DrawingContext } from "./DrawingContext";
import { GeometricNormal } from "./GeometricNormal";
import { RichText } from "./RichText";

/**
 * Methods that define the geometry of an item.
 */
export interface Geometry {
	/** Compute all points on the borders of the item that a segment of a line intersects. */
	getIntersectionPoints(segment: Line): Point[];
	/** Compute a bounding rectangle of the item.  */
	getMbr(): Mbr;
	/** Compute the nearest point on the edge of the item to a point. */
	getNearestEdgePointTo(point: Point): Point;
	/** Compute the distance from the item to a point. */
	getDistanceToPoint(point: Point): number;
	/** Find if item is under a point. */
	isUnderPoint(point: Point): boolean;
	/** Find if item is not futher away from a point that a distance. */
	isNearPoint(point: Point, distance: number): boolean;
	/** Find if item is enclosed or crossed by a bounding rectangle. */
	isEnclosedOrCrossedBy(rect: Mbr): boolean;
	/** Find if item is enclosed by a bounding rectangle. */
	isEnclosedBy(rect: Mbr): boolean;
	/** Find if item can possibly be seen inside of a bounding rectangle. */
	isInView(rect: Mbr): boolean;
	/** Find normal vector that point outside of the item from a point on the edge of the item nearest to a point. */
	getNormal(point: Point): GeometricNormal;
	/** Render the item on a Drawing Context */
	render(context: DrawingContext): void;
	/** Get RichText handle if exists */
	getRichText(): RichText | null;
}
