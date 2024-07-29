import { CubicBezier } from "../../Curve";
import { Path, Segment } from "../../Path";
import {
	BoardPoint,
	ControlPoint,
	FixedConnectorPoint,
	FixedPoint,
	FloatingPoint,
} from "../ControlPoint";
import { Point } from "../../Point";

// для того чтобы создать безье сплайн (последовательность кривых) через последовательность точек
// нужно расчитать параметры кривых с помощью алгоритма для подгонки кривых (curve fitting)
// https://pomax.github.io/bezierinfo
// https://apoorvaj.io/cubic-bezier-through-four-points/
// https://www.particleincell.com/2012/bezier-splines/
// https://stackoverflow.com/questions/7054272/how-to-draw-smooth-curve-through-n-points-using-javascript-html5-canvas
// http://output.jsbin.com/ApitIxo/2/

// by proto-arrows https://github.com/krismuniz/proto-arrows/blob/cdfd0a1ef35342362f619c8f21e385aa3d67725e/src/path.ts
const config = {
	controlPointOffsetRate: 0.75,
	minLengthForBorder: 50,
	normalControlLength: 50,
	flip: false,
};

export function getCurvedLine(
	start: ControlPoint,
	end: ControlPoint,
	middle: BoardPoint[],
): Path {
	const segments: Segment[] = [];

	let startControl: { point: Point; control: Point };
	let endControl: { point: Point; control: Point };

	if (start.pointType === "Board" && end.pointType === "Board") {
		const dX = end.x - start.x;
		const dY = end.y - start.y;
		const fdX = dX * (config.flip ? config.controlPointOffsetRate : 0);
		let fdY = dY * (config.flip ? 0 : -config.controlPointOffsetRate);

		if (Math.abs(fdY) < config.minLengthForBorder) {
			fdY =
				fdY < 0
					? -config.minLengthForBorder
					: config.minLengthForBorder;
		}

		startControl = {
			control: new Point(start.x + fdX, start.y - fdY),
			point: start,
		};
		endControl = {
			control: new Point(end.x - fdX, end.y + fdY),
			point: end,
		};
	} else {
		if (start.pointType === "Board") {
			startControl = { point: start, control: start };
		} else {
			startControl = calculatePoint(start, end);
		}

		if (end.pointType === "Board") {
			endControl = { point: end, control: end };
		} else {
			endControl = calculatePoint(end, start);
		}
	}

	if (middle.length === 0) {
		segments.push(
			new CubicBezier(
				startControl.point,
				startControl.control,
				endControl.point,
				endControl.control,
			),
		);
	} else {
		for (const point of middle) {
			segments.push(
				new CubicBezier(
					start,
					startControl.point,
					endControl.point,
					point,
				),
			);
		}
		segments.push(
			new CubicBezier(start, startControl.point, endControl.point, end),
		);
	}
	return new Path(segments);
}

function calculatePoint(
	point: FixedPoint | FixedConnectorPoint | FloatingPoint,
	prevPoint: Point,
): { point: Point; control: Point } {
	const normal = point.item.getNormal(point);

	let invertCoff = 1;

	if (!point.item.isClosed()) {
		const prevVector = vectorBetweenPoints(point, prevPoint);
		const angleNormalPoint = degreesBetweenVectors(
			normal.normalPoint,
			prevVector,
		);
		const angleNormalInvertPoint = degreesBetweenVectors(
			new Point(normal.normalPoint.x * -1, normal.normalPoint.y * -1),
			prevVector,
		);
		if (angleNormalPoint < angleNormalInvertPoint) {
			invertCoff = -1;
		}
	}

	const distance = Math.sqrt(
		(point.x - prevPoint.x) ** 2 + (point.y - prevPoint.y) ** 2,
	);
	let distanceMultiplier = distance / 100;

	// Apply min and max constraints to the multiplier
	const minMultiplier = 1; // Minimum multiplier value
	const maxMultiplier = 3.0; // Maximum multiplier value
	distanceMultiplier = Math.max(
		minMultiplier,
		Math.min(maxMultiplier, distanceMultiplier),
	);

	const adjustedControlLength =
		config.normalControlLength * distanceMultiplier;

	return {
		control: new Point(
			normal.projectionPoint.x -
				normal.normalPoint.x * adjustedControlLength * invertCoff,
			normal.projectionPoint.y -
				normal.normalPoint.y * adjustedControlLength * invertCoff,
		),
		point: new Point(
			normal.projectionPoint.x - normal.normalPoint.x * invertCoff,
			normal.projectionPoint.y - normal.normalPoint.y * invertCoff,
		),
	};
}

function radiansBetweenVectors(vector1: Point, vector2: Point): number {
	const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
	const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
	const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);
	const cosAngle = dotProduct / (magnitude1 * magnitude2);
	return Math.acos(cosAngle);
}

function degreesBetweenVectors(vector1: Point, vector2: Point): number {
	const angleInRadians = radiansBetweenVectors(vector1, vector2);
	return radiansToDegrees(angleInRadians);
}

function vectorBetweenPoints(point1: Point, point2: Point): Point {
	const dx = point2.x - point1.x;
	const dy = point2.y - point1.y;
	return new Point(dx, dy);
}

function radiansToDegrees(angleInRadians: number): number {
	return (angleInRadians * 180) / Math.PI;
}
