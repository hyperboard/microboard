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
	controlPointOffsetRate: 0.6,
	minLengthForBorder: 30,
	normalControlLength: 100,
	flip: false,
};

// export function getCurvedLine(
// 	start: ControlPoint,
// 	end: ControlPoint,
// 	middle: BoardPoint | null,
// ): Path {
// 	const segments: Segment[] = [];

// 	let startControl: { point: Point; control: Point };
// 	let endControl: { point: Point; control: Point };

// 	const dX = end.x - start.x;
// 	const dY = end.y - start.y;
// 	const distance = Math.sqrt(dX * dX + dY * dY);

// 	if (distance < 40) {
// 		config.normalControlLength = distance;
// 	} else {
// 		config.normalControlLength = 100;
// 	}

// 	if (start.pointType === "Board" && end.pointType === "Board") {
// 		const fdX = dX * (config.flip ? config.controlPointOffsetRate : 0);
// 		let fdY = dY * (config.flip ? 0 : -config.controlPointOffsetRate);

// 		if (Math.abs(fdY) < config.minLengthForBorder) {
// 			fdY =
// 				fdY < 0
// 					? -config.minLengthForBorder
// 					: config.minLengthForBorder;
// 		}

// 		startControl = {
// 			control: new Point(start.x + fdX, start.y - fdY),
// 			point: start,
// 		};
// 		endControl = {
// 			control: new Point(end.x - fdX, end.y + fdY),
// 			point: end,
// 		};
// 	} else {
// 		if (start.pointType === "Board") {
// 			startControl = { point: start, control: start };
// 		} else {
// 			startControl = calculatePoint(start, end);
// 		}

// 		if (end.pointType === "Board") {
// 			endControl = { point: end, control: end };
// 		} else {
// 			endControl = calculatePoint(end, start);
// 		}
// 	}

// 	if (middle.length === 0) {
// 		segments.push(
// 			new CubicBezier(
// 				startControl.point,
// 				startControl.control,
// 				endControl.point,
// 				endControl.control,
// 			),
// 		);
// 	} else {
// 		for (const point of middle) {
// 			segments.push(
// 				new CubicBezier(
// 					start,
// 					startControl.point,
// 					endControl.point,
// 					point,
// 				),
// 			);
// 		}
// 		segments.push(
// 			new CubicBezier(start, startControl.point, endControl.point, end),
// 		);
// 	}
// 	return new Path(segments);
// }

export function getCurvedLine(
	start: ControlPoint,
	end: ControlPoint,
	middle: BoardPoint | null,
): Path {
	const segments: Segment[] = [];

	let startControl: { point: Point; control: Point };
	let endControl: { point: Point; control: Point };

	const dX = end.x - start.x;
	const dY = end.y - start.y;
	const distance = Math.sqrt(dX * dX + dY * dY);

	config.normalControlLength = distance < 40 ? distance : 100;

	if (start.pointType === "Board" && end.pointType === "Board") {
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
		startControl =
			start.pointType === "Board"
				? { point: start, control: start }
				: calculatePoint(start, end);

		endControl =
			end.pointType === "Board"
				? { point: end, control: end }
				: calculatePoint(end, start);
	}

	if (!middle) {
		segments.push(
			new CubicBezier(
				startControl.point,
				startControl.control,
				endControl.point,
				endControl.control,
			),
		);
	} else {
		const middlePoint = middle;
		const CONTROL_POINT_FACTOR = 1;

		const d1x = middlePoint.x - start.x;
		const d1y = middlePoint.y - start.y;
		const c1 = new Point(
			start.x + d1x * CONTROL_POINT_FACTOR,
			start.y + d1y * CONTROL_POINT_FACTOR,
		);
		const c2 = new Point(
			middlePoint.x - d1x * CONTROL_POINT_FACTOR,
			middlePoint.y - d1y * CONTROL_POINT_FACTOR,
		);

		segments.push(new CubicBezier(start, c1, c2, middlePoint));

		const d2x = end.x - middlePoint.x;
		const d2y = end.y - middlePoint.y;
		const c3 = new Point(
			middlePoint.x + d2x * CONTROL_POINT_FACTOR,
			middlePoint.y + d2y * CONTROL_POINT_FACTOR,
		);
		const c4 = new Point(
			end.x - d2x * CONTROL_POINT_FACTOR,
			end.y - d2y * CONTROL_POINT_FACTOR,
		);

		segments.push(new CubicBezier(middlePoint, c3, c4, end));
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

	return {
		control: new Point(
			normal.projectionPoint.x -
				normal.normalPoint.x * config.normalControlLength * invertCoff,
			normal.projectionPoint.y -
				normal.normalPoint.y * config.normalControlLength * invertCoff,
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
