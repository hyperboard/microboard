import {FixedConnectorPoint, FixedPoint, FloatingPoint, Line, Mbr} from 'Items';
import { Point } from '../../Point';
import { ControlPoint } from '../ControlPoint';
import { ConnectedPointerDirection, getPointerDirection } from '../Pointers';
import {conf} from "Settings";

interface Node {
	point: Point;
	costSoFar: number;
	heuristic: number;
	toFinish: number;
	parent?: Node;
	xGrid: number;
	yGrid: number;
}

type Direction = 'vertical' | 'horizontal';

export function getDirection(from: Point, to?: Point): Direction | null {
	if (!to) {
		return null;
	}
	if (from.x === to.x) {
		return 'vertical';
	} else if (from.y === to.y) {
		return 'horizontal';
	}
	return null;
}

function isChangingDirection(
	current: Node,
	neighbor: Node,
	newStart?: ControlPoint,
	newEnd?: ControlPoint
): number {
	const dirMap: Record<ConnectedPointerDirection, Direction> = {
		top: 'vertical',
		bottom: 'vertical',
		right: 'horizontal',
		left: 'horizontal',
	};

	const comingDirection =
		newStart && current.point.barelyEqual(newStart)
			? dirMap[getPointerDirection(newStart)!]
			: getDirection(current.point, current.parent?.point);
	const goingDirection = getDirection(current.point, neighbor.point);
	if (newEnd && neighbor.point.barelyEqual(newEnd)) {
		const endDir = dirMap[getPointerDirection(newEnd)!];
		if (goingDirection && endDir !== goingDirection) {
			return 1 + isChangingDirection(current, neighbor, newStart);
		}
	}

	return comingDirection && goingDirection && comingDirection !== goingDirection ? 1 : 0;
}

function heuristic(start: Node, end: Node): number {
	// Manhattan distance in grid
	return Math.abs(start.xGrid - end.xGrid) + Math.abs(start.yGrid - end.yGrid);
}

function getNeighbors(node: Node, grid: Point[][], obstacles: Mbr[]): Node[] {
	const neighbors: Node[] = [];
	const potentialNeighbors = [
		{ x: node.xGrid - 1, y: node.yGrid },
		{ x: node.xGrid + 1, y: node.yGrid },
		{ x: node.xGrid, y: node.yGrid - 1 },
		{ x: node.xGrid, y: node.yGrid + 1 },
	];

	for (const pos of potentialNeighbors) {
		// Check if the new position is within the grid bounds
		if (pos.x >= 0 && pos.x < grid.length && pos.y >= 0 && grid[pos.x] && grid[pos.x][pos.y]) {
			const newPoint = grid[pos.x][pos.y];
			if (
				newPoint &&
				!obstacles.some(obstacle => obstacle.isAlmostInside(newPoint, conf.CONNECTOR_ITEM_OFFSET - 1))
			) {
				neighbors.push({
					point: newPoint,
					costSoFar: 0,
					heuristic: 0,
					toFinish: 0,
					parent: node,
					xGrid: pos.x,
					yGrid: pos.y,
				});
			}
		}
	}

	return neighbors;
}

function findCenterLine(
	grid: Point[][],
	start: ControlPoint,
	end: ControlPoint,
	middle?: Point
): Point[] {
	const centerLine: Point[] = [];
	const middlePoint = middle ? middle : new Point((start.x + end.x) / 2, (start.y + end.y) / 2);
	const min = new Point(Math.min(start.x, end.x), Math.min(start.y, end.y));
	const max = new Point(Math.max(start.x, end.x), Math.max(start.y, end.y));
	const width = max.x - min.x;
	const height = max.y - min.y;

	if (start.pointType !== 'Board' && end.pointType !== 'Board') {
		const isInGrid = grid.some(row => row.some(point => point.barelyEqual(middlePoint)));
		return isInGrid ? [middlePoint] : [];
	}

	if (width > height) {
		const centerIdx = grid.findIndex(
			row => row[0].x === middlePoint.x || Math.abs(row[0].x - middlePoint.x) < 0.01
		);
		if (centerIdx !== -1) {
			for (let y = 0; y < grid[0].length; y++) {
				if (
					grid[centerIdx][y] &&
					grid[centerIdx][y].x >= min.x - 0.01 &&
					grid[centerIdx][y].x <= max.x + 0.01 &&
					grid[centerIdx][y].y >= min.y - 0.01 &&
					grid[centerIdx][y].y <= max.y + 0.01
				) {
					centerLine.push(grid[centerIdx][y]);
				}
			}
		}
	} else {
		const centerIdx = grid[0].findIndex(
			point => point.y === middlePoint.y || Math.abs(point.y - middlePoint.y) < 0.01
		);
		if (centerIdx !== -1) {
			for (let x = 0; x < grid.length; x++) {
				if (
					grid[x][centerIdx] &&
					grid[x][centerIdx].x >= min.x - 0.01 &&
					grid[x][centerIdx].x <= max.x + 0.01 &&
					grid[x][centerIdx].y >= min.y - 0.01 &&
					grid[x][centerIdx].y <= max.y + 0.01
				) {
					centerLine.push(grid[x][centerIdx]);
				}
			}
		}
	}

	return centerLine;
}

function createGrid(
	start: ControlPoint,
	end: ControlPoint,
	toVisitPoints: Point[] = []
): {
	grid: Point[][];
	newStart?: ControlPoint;
	newEnd?: ControlPoint;
	middlePoint?: Point;
} {
	const startDir = getPointerDirection(start);
	const endDir = getPointerDirection(end);
	const revertMapDir = { top: 0, bottom: 1, right: 2, left: 3 };
	const offsetMap = {
		top: { x: 0, y: -conf.CONNECTOR_ITEM_OFFSET },
		bottom: { x: 0, y: conf.CONNECTOR_ITEM_OFFSET },
		right: { x: conf.CONNECTOR_ITEM_OFFSET, y: 0 },
		left: { x: -conf.CONNECTOR_ITEM_OFFSET, y: 0 },
	};

	const horizontalLines: number[] = [];
	const verticalLines: number[] = [];

	let newStart: ControlPoint | undefined;
	let newEnd: ControlPoint | undefined;

	const processPoint = (point: FloatingPoint | FixedPoint | FixedConnectorPoint, dir: ConnectedPointerDirection): ControlPoint => {
		const itemMbr = point.item.getMbr();
		const mbrFloored = new Mbr(
			Math.floor(itemMbr.left),
			Math.floor(itemMbr.top),
			Math.floor(itemMbr.right),
			Math.floor(itemMbr.bottom)
		);

		const pointOnMbr = mbrFloored
			.getLines()
			[revertMapDir[dir]].getNearestPointOnLineSegment(point);

		const newPoint = Object.create(
			Object.getPrototypeOf(point),
			Object.getOwnPropertyDescriptors(point)
		) as ControlPoint;

		newPoint.x = pointOnMbr.x + offsetMap[dir].x;
		newPoint.y = pointOnMbr.y + offsetMap[dir].y;

		verticalLines.push(
			mbrFloored.left - conf.CONNECTOR_ITEM_OFFSET,
			mbrFloored.left,
			pointOnMbr.x,
			mbrFloored.right,
			mbrFloored.right + conf.CONNECTOR_ITEM_OFFSET
		);

		horizontalLines.push(
			mbrFloored.top - conf.CONNECTOR_ITEM_OFFSET,
			mbrFloored.top,
			pointOnMbr.y,
			mbrFloored.bottom,
			mbrFloored.bottom + conf.CONNECTOR_ITEM_OFFSET
		);

		return newPoint;
	};

	if (start.pointType !== 'Board' && startDir) {
		newStart = processPoint(start, startDir);
	}

	if (end.pointType !== 'Board' && endDir) {
		newEnd = processPoint(end, endDir);
	}

	const finalStart = newStart || start;
	const finalEnd = newEnd || end;

	const middle = new Point((finalStart.x + finalEnd.x) / 2, (finalStart.y + finalEnd.y) / 2);

	horizontalLines.push(middle.y, finalStart.y, finalEnd.y);
	verticalLines.push(middle.x, finalStart.x, finalEnd.x);

	toVisitPoints.forEach(p => {
		horizontalLines.push(p.y);
		verticalLines.push(p.x);
	});

	const uniqueHorizontalLines = Array.from(new Set(horizontalLines)).sort((a, b) => a - b);
	const uniqueVerticalLines = Array.from(new Set(verticalLines)).sort((a, b) => a - b);

	const grid: Point[][] = uniqueVerticalLines.map(x =>
		uniqueHorizontalLines.map(y => new Point(x, y))
	);

	return {
		grid,
		newStart,
		newEnd,
		middlePoint: middle,
	};
}

function findPath(
	start: Point,
	end: Point,
	grid: Point[][],
	obstacles: Mbr[],
	existingPath: Set<string>,
	newStart?: ControlPoint,
	newEnd?: ControlPoint
): Point[] | undefined {
	const startRowIndex = grid.findIndex(row => row.some(point => point.barelyEqual(start)));
	if (startRowIndex === -1) {
		throw new Error('Start point not found in the grid row');
	}
	const startPointIndex = grid[startRowIndex].findIndex(point => point.barelyEqual(start));
	if (startPointIndex === -1) {
		throw new Error('Start point not found in the grid column');
	}

	const endRowIndex = grid.findIndex(row => row.some(point => point.barelyEqual(end)));
	if (endRowIndex === -1) {
		throw new Error('End point not found in the grid row');
	}
	const endPointIndex = grid[endRowIndex].findIndex(point => point.barelyEqual(end));
	if (endPointIndex === -1) {
		throw new Error('End point not found in the grid column');
	}


	const endNode: Node = {
		point: end,
		xGrid: endRowIndex,
		yGrid: endPointIndex,
		costSoFar: 0,
		heuristic: 0,
		toFinish: 0,
	};

	const startNode: Node = {
		point: start,
		costSoFar: 0,
		heuristic: heuristic(
			{ point: start, xGrid: startRowIndex, yGrid: startPointIndex } as Node,
			endNode
		),
		toFinish: heuristic(
			{ point: start, xGrid: startRowIndex, yGrid: startPointIndex } as Node,
			endNode
		),
		xGrid: startRowIndex,
		yGrid: startPointIndex,
	};
	const openSet: Node[] = [startNode];
	const closedSet: Set<string> = new Set();

	while (openSet.length > 0) {
		openSet.sort((aa, bb) => aa.toFinish - bb.toFinish);
		const current = openSet.shift()!;
		const currentKey = `${current.point.x},${current.point.y}`;

		if (current.point.barelyEqual(end)) {
			const path = reconstructPath(current);
			return path;
		}

		closedSet.add(currentKey);
		const neighbors = getNeighbors(current, grid, obstacles);

		for (const neighbor of neighbors) {
			const neighborKey = `${neighbor.point.x},${neighbor.point.y}`;

			if (closedSet.has(neighborKey) || (existingPath.has(neighborKey) && !neighbor.point.barelyEqual(end))) {
				continue;
			}

			const extraCost = isChangingDirection(current, neighbor, newStart, newEnd);

			const pathOverlapCost = existingPath.has(neighborKey) ? 1000 : 0;
			const tentativeCost = current.costSoFar + 1 + pathOverlapCost;

			let existingNodeInOpenSet = openSet.find(node => node.point.barelyEqual(neighbor.point));

			if (!existingNodeInOpenSet || tentativeCost < existingNodeInOpenSet.costSoFar) {
				if (existingNodeInOpenSet) {
					existingNodeInOpenSet.costSoFar = tentativeCost + extraCost;
					existingNodeInOpenSet.heuristic = heuristic(neighbor, endNode);
					existingNodeInOpenSet.toFinish = existingNodeInOpenSet.costSoFar + existingNodeInOpenSet.heuristic;
					existingNodeInOpenSet.parent = current;
				} else {
					neighbor.costSoFar = tentativeCost + extraCost;
					neighbor.heuristic = heuristic(neighbor, endNode);
					neighbor.toFinish = neighbor.costSoFar + neighbor.heuristic;
					openSet.push(neighbor);
				}
			}
		}
	}

	return undefined;
}

function findPathPoints(
	points: Point[],
	grid: Point[][],
	obstacles: Mbr[],
	newStart?: ControlPoint,
	newEnd?: ControlPoint
): Point[] {
	const finalPath: Point[] = [];
	const existingPathSegments = new Set<string>();

	if (points.length > 0) {
		finalPath.push(points[0]);
		const startKey = `${points[0].x},${points[0].y}`;
		existingPathSegments.add(startKey);
	}

	for (let i = 0; i < points.length - 1; i += 1) {
		const segmentPath = findPath(points[i], points[i + 1], grid, obstacles, existingPathSegments, newStart, newEnd);

		if (segmentPath && segmentPath.length > 0) {
			for (let j = 1; j < segmentPath.length; j++) {
				const point = segmentPath[j];
				const key = `${point.x},${point.y}`;
				finalPath.push(point);
				existingPathSegments.add(key);
			}
		} else {
			points.splice(i + 1, 1);
			i--;
		}
	}

	return finalPath;
}

/**
 * Removes points from centerLine that will probably be visited twice or lengthen the path
 */
export function removeUnnecessaryPoints(
	pathToCenterLine: Point[],
	centerLine: Point[],
	fromStart: boolean
): void {
	const foundPoint = pathToCenterLine.reduce((acc, point, index) => {
		if (acc) {
			return acc;
		}
		if (
			index !== pathToCenterLine.length - 1 &&
			centerLine.some(centerLinePoint => centerLinePoint.barelyEqual(point))
		) {
			return point;
		}
		return undefined;
	}, undefined as undefined | Point);
	if (foundPoint) {
		const foundIndex = centerLine.reduce((acc, point, index) => {
			if (acc !== -1) {
				return acc;
			}
			if (point.barelyEqual(foundPoint)) {
				return index;
			}
			return -1;
		}, -1);
		if (foundIndex !== -1) {
			if (fromStart) {
				centerLine.splice(0, foundIndex);
			} else {
				centerLine.splice(foundIndex + 1);
			}
		}
	}
}

/**
 * Returns an array without repeated points, removing loops
 */
function reducePoints(points: Point[]): Point[] {
	const uniquePoints = new Map<string, number>();
	const result: Point[] = [];

	for (let i = 0; i < points.length; i++) {
		const point = points[i];
		const key = `${point.x},${point.y}`;

		if (uniquePoints.has(key)) {
			const loopStartIndex = uniquePoints.get(key)!;
			result.splice(loopStartIndex + 1);
			const removedPoints = points.slice(loopStartIndex + 1, i + 1);
			removedPoints.forEach(p => {
				uniquePoints.delete(`${p.x},${p.y}`);
			});
			uniquePoints.set(key, result.length);
			result.push(point);

		} else {
			uniquePoints.set(key, result.length);
			result.push(point);
		}
	}

	return result;
}

function getLines(pathPoints: Point[]): Line[] {
	if (pathPoints.length < 2) {
		return [];
	}

	const reducedPoints = reducePoints(pathPoints);
	if (reducedPoints.length < 2) {
		return [];
	}

	const lines: Line[] = [];
	let startPoint = reducedPoints[0];

	for (let i = 1; i < reducedPoints.length; i++) {
		const currentPoint = reducedPoints[i];
		const nextPoint = i + 1 < reducedPoints.length ? reducedPoints[i + 1] : null;

		const direction = getDirection(startPoint, currentPoint);

		if (!nextPoint || direction !== getDirection(currentPoint, nextPoint)) {
			lines.push(new Line(startPoint, currentPoint));
			startPoint = currentPoint;
		}
	}

	return lines;
}

function reconstructPath(node: Node): Point[] {
	const path: Point[] = [];
	let current: Node | undefined = node;
	while (current) {
		path.push(current.point);
		current = current.parent;
	}
	return path.reverse();
}

function createHookWaypoints(
	startPoint: Point,
	endPoint: Point,
	startDir?: ConnectedPointerDirection | null,
	endDir?: ConnectedPointerDirection | null
): Point[] {
	if (startDir === 'right' && endDir === 'left' && startPoint.x > endPoint.x) {
		const midY = (startPoint.y + endPoint.y) / 2;
		console.log("111")
		console.log([new Point(startPoint.x, midY), new Point(endPoint.x, midY)])
		return [new Point(startPoint.x, midY), new Point(endPoint.x, midY)];
	}
	if (startDir === 'left' && endDir === 'right' && startPoint.x < endPoint.x) {
		const midY = (startPoint.y + endPoint.y) / 2;
		console.log("222")
		console.log([new Point(startPoint.x, midY), new Point(endPoint.x, midY)])
		return [new Point(startPoint.x, midY), new Point(endPoint.x, midY)];
	}
	if (startDir === 'bottom' && endDir === 'top' && startPoint.y > endPoint.y) {
		const midX = (startPoint.x + endPoint.x) / 2;
		console.log("333")
		console.log([new Point(midX, startPoint.y), new Point(midX, endPoint.y)])
		return [new Point(midX, startPoint.y), new Point(midX, endPoint.y)];
	}
	if (startDir === 'top' && endDir === 'bottom' && startPoint.y < endPoint.y) {
		const midX = (startPoint.x + endPoint.x) / 2;
		console.log("444")
		console.log([new Point(midX, startPoint.y), new Point(midX, endPoint.y)])
		return [new Point(midX, startPoint.y), new Point(midX, endPoint.y)];
	}

	const dx = endPoint.x - startPoint.x;
	const dy = endPoint.y - startPoint.y;

	const startConflictX = (startDir === 'right' && dx < 0) || (startDir === 'left' && dx > 0);
	const startConflictY = (startDir === 'bottom' && dy < 0) || (startDir === 'top' && dy > 0);

	const endConflictX = (endDir === 'right' && dx > 0) || (endDir === 'left' && dx < 0);
	const endConflictY = (endDir === 'bottom' && dy < 0) || (endDir === 'top' && dy > 0);

	if (startConflictX || endConflictY) {
		console.log("555")
		console.log([new Point(startPoint.x, endPoint.y)])
		return [new Point(startPoint.x, endPoint.y)];
	}

	if (startConflictY || endConflictX) {
		console.log("666")
		console.log([new Point(endPoint.x, startPoint.y)])
		return [new Point(endPoint.x, startPoint.y)];
	}

	return [];
}

export function findOrthogonalPath(
	start: ControlPoint,
	end: ControlPoint,
	obstacles: Mbr[],
	toVisitPoints: Point[] = []
): { lines: Line[]; newStart?: ControlPoint; newEnd?: ControlPoint } {
	const { grid, newStart, newEnd } = createGrid(start, end, toVisitPoints);

	const startPoint = newStart || start;
	const endPoint = newEnd || end;

	const startDir = getPointerDirection(start);
	const endDir = getPointerDirection(end);
	const	hookWaypoints = createHookWaypoints(startPoint, endPoint, startDir, endDir);

	const points = [startPoint, ...hookWaypoints, ...toVisitPoints, endPoint];

	const pathPoints = findPathPoints(points, grid, obstacles, newStart, newEnd);

	console.log("RESULT", {
		lines: getLines(pathPoints),
		newStart,
		newEnd,
	})

	return {
		lines: getLines(pathPoints),
		newStart,
		newEnd,
	};
}
