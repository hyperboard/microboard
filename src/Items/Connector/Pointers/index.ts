import { CubicBezier } from "Board/Items/Curve";
import { Path, Paths } from "Board/Items/Path";
import { Matrix } from "Board/Items/Transformation";
import { ConnectorLineStyle } from "../Connector";
import { ControlPoint } from "../ControlPoint";
import { Point } from "Board/Items/Point";
import { getPointer } from "./Pointers";

export function getStartPointer(
	point: ControlPoint,
	pointerStyle: string,
	lineStyle: ConnectorLineStyle,
	lines: Path,
): { path: Path | Paths; start: Point; end: Point } {
	const angleRadians = getStartPointerRotation(point, lineStyle, lines);
	const matrix = getPointerMatrix(point, angleRadians);
	const pointer = getPointer(pointerStyle);
	return {
		path: pointer.path.getTransformed(matrix),
		start: pointer.start.getTransformed(matrix),
		end: pointer.end.getTransformed(matrix),
	};
}

function getStartPointerRotation(
	point: ControlPoint,
	lineStyle: ConnectorLineStyle,
	lines: Path,
): number {
	if (lineStyle === "straight") {
		return lines.getNormal(point).getAngleRadiansNormal() + Math.PI / 2;
	}

	if (lineStyle !== "curved") {
		return 0;
	}
	const segment = lines.getSegments()[0];
	if (!(segment instanceof CubicBezier)) {
		return 0;
	}
	if (point.pointType !== "Board") {
		const controlPoint = segment.startControl;
		const normalPoint = segment.start;
		return radiansBetweenPoints(controlPoint, normalPoint);
	} else {
		const point1 = segment.getPoint(0.05);
		const point2 = segment.getPoint(0);
		return radiansBetweenPoints(point1, point2);
	}
}

export function getEndPointer(
	point: ControlPoint,
	pointerStyle: string,
	lineStyle: ConnectorLineStyle,
	lines: Path,
): { path: Path | Paths; start: Point; end: Point } {
	const angleRadians = getEndPointerRotation(point, lineStyle, lines);
	const matrix = getPointerMatrix(point, angleRadians);
	const pointer = getPointer(pointerStyle);
	return {
		path: pointer.path.getTransformed(matrix),
		start: pointer.start.getTransformed(matrix),
		end: pointer.end.getTransformed(matrix),
	};
}

function getEndPointerRotation(
	point: ControlPoint,
	lineStyle: ConnectorLineStyle,
	lines: Path,
): number {
	if (lineStyle === "straight") {
		return (
			lines.getNormal(point).getAngleRadiansNormal() + (Math.PI / 2) * 3
		);
	}
	if (lineStyle !== "curved") {
		return 0;
	}
	const segments = lines.getSegments();
	const segment = segments[segments.length - 1];

	if (!(segment instanceof CubicBezier)) {
		return 0;
	}
	if (point.pointType !== "Board") {
		const controlPoint = segment.endControl;
		const normalPoint = segment.end;
		return radiansBetweenPoints(controlPoint, normalPoint);
	} else {
		const point1 = segment.getPoint(0.95);
		const point2 = segment.getPoint(1);
		return radiansBetweenPoints(point1, point2);
	}
}

function getPointerMatrix(point: ControlPoint, angleRadians: number): Matrix {
	const scale = 0.3;
	const matrix = new Matrix(point.x, point.y, scale, scale);
	matrix.rotateByRadian(angleRadians);
	const anchor = new Point(100, 50);
	const anchorRotation = new Matrix(0, 0, 1, 1);
	anchorRotation.rotateByRadian(angleRadians);
	anchor.transform(anchorRotation);
	matrix.translate(-anchor.x * scale, -anchor.y * scale);
	return matrix;
}

function radiansBetweenPoints(point1: Point, point2: Point): number {
	return Math.atan2(point2.y - point1.y, point2.x - point1.x);
}
