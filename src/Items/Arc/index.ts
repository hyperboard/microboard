import { Point, Line, Mbr, Matrix } from "..";
import { GeometricNormal } from "../GeometricNormal";

export class ArcData {}

// See https://stackoverflow.com/questions/6729056/mapping-svg-arcto-to-html-canvas-arcto
// TODO
export class Arc {
	type = "Arc" as const;

	constructor(
		public center = new Point(),
		public radius = 1,
		public startAngle = 0, // in radians, measured from the positive x-axis
		public endAngle = 0,
		public isCounterclockwise = false,
	) {
		if (radius <= 0) {
			this.radius = 1;
		}
	}

	getIntersectionPoints(_segment: Line): Point[] {
		throw new Error("Method not implemented.");
	}

	getNearestEdgePointTo(_point: Point): Point {
		throw new Error("Method not implemented.");
	}

	isInBoundsByBounds(_bounds: Mbr): boolean {
		throw new Error("Method not implemented.");
	}

	getMbr(): Mbr {
		throw new Error("Method not implemented.");
	}

	isEnclosedOrCrossedBy(_bounds: Mbr): boolean {
		throw new Error("Method not implemented.");
	}

	getNormal(_point: Point): GeometricNormal {
		throw new Error("Method not implemented.");
	}

	moveToStart(_ctx: Path2D | CanvasRenderingContext2D): void {}

	render(_ctx: Path2D | CanvasRenderingContext2D): void {
		throw new Error("Method not implemented.");
	}

	transform(_matrix: Matrix): void {
		throw new Error("Method not implemented.");
	}

	getTransformed(_matrix: Matrix): Arc {
		throw new Error("Method not implemented.");
	}

	getCenterPoint(): Point {
		throw new Error("Method not implemented.");
	}

	getPointByTangent(_tangent: number): Point {
		throw new Error("Method not implemented.");
	}
	getTangentByPoint(_point: Point): number {
		throw new Error("Method not implemented.");
	}

	copy(): Arc {
		return new Arc();
	}
}
