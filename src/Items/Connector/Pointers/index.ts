import { CubicBezier } from "Board/Items/Curve";
import { Path, Paths } from "Board/Items/Path";
import { Matrix } from "Board/Items/Transformation";
import { ConnectorLineStyle } from "../Connector";
import { ControlPoint } from "../ControlPoint";
import { Point } from "Board/Items/Point";
import { getPointer, Pointer } from "./Pointers";

export type ConnectedPointerDirection = "top" | "bottom" | "right" | "left";
export type ConnectorEdge = "start" | "end";

interface GetRotationParams {
	point: ControlPoint;
	lines: Path;
	type: ConnectorEdge;
}

/** If connected to item returns direction of connection otherwise returns undefined */
export function getPointerDirection(
	point: ControlPoint,
): ConnectedPointerDirection | undefined {
	if (point.pointType !== "Board") {
		const itemLines = point.item.getMbr().getLines();
		const connectedLine = itemLines.reduce(
			(acc, line, index) => {
				if (line.getDistance(point) < acc.line.getDistance(point)) {
					return { line, index };
				}
				return acc;
			},
			{ line: itemLines[0], index: 0 },
		);
		const map: { [K in number]: ConnectedPointerDirection } = {
			0: "top",
			1: "bottom",
			2: "right",
			3: "left",
		};
		return map[connectedLine.index];
	}

	return undefined;
}

function getStraightRotation({
	point,
	lines,
	type,
}: GetRotationParams): number {
	if (type === "end") {
		return (
			lines.getNormal(point).getAngleRadiansNormal() + (Math.PI / 2) * 3
		);
	}
	return lines.getNormal(point).getAngleRadiansNormal() + Math.PI / 2;
}

function getCurvedRotation({ point, lines, type }: GetRotationParams): number {
	const segments = lines.getSegments();
	const segment =
		type === "end" ? segments[segments.length - 1] : segments[0];

	if (!(segment instanceof CubicBezier)) {
		return 0;
	}
	if (point.pointType !== "Board") {
		const controlPoint =
			type === "end" ? segment.endControl : segment.startControl;
		const normalPoint = type === "end" ? segment.end : segment.start;
		return radiansBetweenPoints(controlPoint, normalPoint);
	} else {
		const offset = type === "end" ? 0.95 : 0.05;
		const point1 = segment.getPoint(offset);
		const point2 = segment.getPoint(type === "end" ? 1 : 0);
		return radiansBetweenPoints(point1, point2);
	}
}

function getOrthogonalRotation({
	point,
	lines,
	type,
}: GetRotationParams): number {
	const dir = getPointerDirection(point);
	if (dir) {
		const mapAngle = {
			top: Math.PI / 2,
			bottom: (3 * Math.PI) / 2,
			right: Math.PI,
			left: 0,
		};
		return mapAngle[dir];
	}

	return getStraightRotation({ point, lines, type });
}

function getPointerRotation(
	point: ControlPoint,
	lineStyle: ConnectorLineStyle,
	lines: Path,
	type: ConnectorEdge,
): number {
	const rotationMap: {
		[K in ConnectorLineStyle]: (data: GetRotationParams) => number;
	} = {
		orthogonal: getOrthogonalRotation,
		straight: getStraightRotation,
		curved: getCurvedRotation,
	};

	return rotationMap[lineStyle]({ point, lines, type });
}

export function getStartPointer(
	point: ControlPoint,
	pointerStyle: string,
	lineStyle: ConnectorLineStyle,
	lines: Path,
): Pointer {
	const angleRadians = getPointerRotation(point, lineStyle, lines, "start");
	const matrix = getPointerMatrix(point, angleRadians);
	const pointer = getPointer(pointerStyle);
	return {
		path: pointer.path.getTransformed(matrix),
		start: pointer.start.getTransformed(matrix),
		end: pointer.end.getTransformed(matrix),
		name: pointer.name,
	};
}

export function getEndPointer(
	point: ControlPoint,
	pointerStyle: string,
	lineStyle: ConnectorLineStyle,
	lines: Path,
): Pointer {
	const angleRadians = getPointerRotation(point, lineStyle, lines, "end");
	const matrix = getPointerMatrix(point, angleRadians);
	const pointer = getPointer(pointerStyle);
	return {
		path: pointer.path.getTransformed(matrix),
		start: pointer.start.getTransformed(matrix),
		end: pointer.end.getTransformed(matrix),
		name: pointer.name,
	};
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
