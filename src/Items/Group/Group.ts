import { Subject } from "Subject";
import { Events } from "pg";
import { DrawingContext } from "../DrawingContext";
import { GeometricNormal } from "../GeometricNormal";
import { Geometry } from "../Geometry";
import { Item } from "../Item";
import { Line } from "../Line";
import { Mbr } from "../Mbr";
import { Point } from "../Point";
import { Transformation, TransformationData } from "../Transformation";
import { Board } from "../../Board";

export interface GroupData {
	itemType: "Group";
	id: string;
	children: string[];
	transformation: TransformationData;
}

export class Group implements Geometry {
	readonly itemType = "Group";
	parent = "Board";
	readonly transformation = new Transformation(this.id);
	readonly subject = new Subject<Group>();

	constructor(
		private children: Item[],
		private id = "",
		private board: Board,
		private events?: Events,
	) {
		for (const child of children) {
			child.parent = this.id;
			child.subject.publish(child);
		}
	}

	setId(id: string): void {
		this.id = id;
	}

	serialize(): GroupData {
		const children = [];
		for (const child of this.children) {
			children.push(child.getId());
		}
		return {
			itemType: "Group",
			id: this.id,
			children,
			transformation: this.transformation.serialize(),
		};
	}

	deserialize(data: GroupData): void {
		this.id = data.id;
		this.children = [];
		for (const id of data.children) {
			const child = this.board.items.getById(id);
			if (child) {
				child.parent = this.id;
				child.subject.publish(child);
				this.children.push(child);
			}
		}
		this.transformation.deserialize(data.transformation);
	}

	getIntersectionPoints(segment: Line): Point[] {
		let points: Point[] = [];
		for (const child of this.children) {
			points = points.concat(child.getIntersectionPoints(segment));
		}
		return points;
	}

	getMbr(): Mbr {
		const mbr = new Mbr();
		for (const child of this.children) {
			mbr.combine(child.getMbr());
		}
		return mbr;
	}

	getNearestEdgePointTo(point: Point): Point {
		let nearestPoint = new Point();
		let nearestDistance = Infinity;
		for (const child of this.children) {
			const distance = child
				.getNearestEdgePointTo(point)
				.getDistance(point);
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestPoint = child.getNearestEdgePointTo(point);
			}
		}
		return nearestPoint;
	}

	getDistanceToPoint(point: Point): number {
		return this.getNearestEdgePointTo(point).getDistance(point);
	}

	isUnderPoint(point: Point): boolean {
		for (const child of this.children) {
			if (child.isUnderPoint(point)) {
				return true;
			}
		}
		return false;
	}

	isNearPoint(point: Point, distance: number): boolean {
		for (const child of this.children) {
			if (child.isNearPoint(point, distance)) {
				return true;
			}
		}
		return false;
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		for (const child of this.children) {
			if (child.isEnclosedOrCrossedBy(rect)) {
				return true;
			}
		}
		return false;
	}

	isEnclosedBy(rect: Mbr): boolean {
		for (const child of this.children) {
			if (child.isEnclosedBy(rect)) {
				return true;
			}
		}
		return false;
	}

	isInView(rect: Mbr): boolean {
		for (const child of this.children) {
			if (child.isInView(rect)) {
				return true;
			}
		}
		return false;
	}

	getNormal(point: Point): GeometricNormal {
		let nearestNormal = this.getMbr().getNormal(point);
		let nearestDistance = Infinity;
		for (const child of this.children) {
			const normal = child.getNormal(point);
			const distance = normal.getDistance();
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestNormal = normal;
			}
		}
		return nearestNormal;
	}

	render(context: DrawingContext): void {
		const ctx = context.ctx;
		ctx.save();
		this.transformation.matrix.applyToContext(ctx);
		for (const child of this.children) {
			child.render(context);
		}
		ctx.restore();
	}
}
