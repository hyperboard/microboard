import {FixedConnectorPoint, FixedPoint, FloatingPoint, Line, Mbr} from 'Items';
import { Point } from '../../Point';
import { ControlPoint } from '../ControlPoint';
import { ConnectedPointerDirection, getPointerDirection } from '../Pointers';

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

const ITEM_OFFSET = 1;

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
		if (pos.x >= 0 && pos.x < grid.length && pos.y >= 0) {
			const newPoint = grid[pos.x][pos.y];
			if (
				newPoint &&
				!obstacles.some(obstacle => obstacle.isAlmostInside(newPoint, ITEM_OFFSET - 1))
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

	// let forceVertical = false;
	// let forceHorizontal = false;
	// const startDir = getPointerDirection(start);
	// const endDir = getPointerDirection(end);
	// if (startDir && endDir) {
	// 	const dirMap = {
	// 		top: {
	// 			// top: "vertical",
	// 			top: {
	// 				vertical: true,
	// 				horizontal: false,
	// 			},
	// 			bottom: "vertical",
	// 			right: "horizontal",
	// 			left: "horizontal",
	// 		},
	// 		bottom: {
	// 			top: "vertical",
	// 			bottom: "vertical",
	// 			right: "horizontal",
	// 			left: "horizontal",
	// 		},
	// 		right: {
	// 			top: "horizontal",
	// 			bottom: "horizontal",
	// 			right: "vertical",
	// 			left: "vertical",
	// 		},
	// 		left: {
	// 			top: "horizontal",
	// 			bottom: "horizontal",
	// 			right: "vertical",
	// 			left: "vertical",
	// 		},
	// 	};
	// }

	if (width > height) {
		const centerIdx = grid.findIndex(
			row => row[0].x === middlePoint.x || Math.abs(row[0].x - middlePoint.x) < 0.01
		);
		for (let y = 0; y < grid[0].length && centerIdx !== -1; y++) {
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
	} else {
		const centerIdx = grid[0].findIndex(
			point => point.y === middlePoint.y || Math.abs(point.y - middlePoint.y) < 0.01
		);
		for (let x = 0; x < grid.length && centerIdx !== -1; x++) {
			if (
				grid[x][centerIdx].x >= min.x - 0.01 &&
				grid[x][centerIdx].x <= max.x + 0.01 &&
				grid[x][centerIdx].y >= min.y - 0.01 &&
				grid[x][centerIdx].y <= max.y + 0.01
			) {
				centerLine.push(grid[x][centerIdx]);
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
		top: { x: 0, y: -ITEM_OFFSET },
		bottom: { x: 0, y: ITEM_OFFSET },
		right: { x: ITEM_OFFSET, y: 0 },
		left: { x: -ITEM_OFFSET, y: 0 },
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
		);

		newPoint.x = pointOnMbr.x + offsetMap[dir].x;
		newPoint.y = pointOnMbr.y + offsetMap[dir].y;

		verticalLines.push(
			mbrFloored.left - ITEM_OFFSET,
			mbrFloored.left,
			pointOnMbr.x,
			mbrFloored.right,
			mbrFloored.right + ITEM_OFFSET
		);

		horizontalLines.push(
			mbrFloored.top - ITEM_OFFSET,
			mbrFloored.top,
			pointOnMbr.y,
			mbrFloored.bottom,
			mbrFloored.bottom + ITEM_OFFSET
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

// function jump(
// 	grid: Point[][],
// 	node: Node,
// 	direction: { x: number; y: number },
// 	end: Point,
// 	obstacles: Mbr[],
// ): Node | null {
// 	let x = node.xGrid;
// 	let y = node.yGrid;

// 	while (true) {
// 		x += direction.x;
// 		y += direction.y;

// 		// Check if the new position is within the grid bounds
// 		if (x < 0 || x >= grid.length || y < 0 || y >= grid[0].length) {
// 			return null;
// 		}

// 		const newPoint = grid[x][y];
// 		if (newPoint.barelyEqual(end)) {
// 			return {
// 				point: newPoint,
// 				costSoFar: 0,
// 				heuristic: 0,
// 				toFinish: 0,
// 				parent: node,
// 				xGrid: x,
// 				yGrid: y,
// 			};
// 		}

// 		if (obstacles.some(obstacle => obstacle.isAlmostInside(newPoint, 10))) {
// 			return null;
// 		}

// 		// Check for forced neighbors
// 		if (direction.x !== 0) {
// 			// Horizontal
// 			if (
// 				(y + 1 < grid[0].length &&
// 					!obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(grid[x][y + 1], 10),
// 					) &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x - direction.x][y + 1],
// 							10,
// 						),
// 					)) ||
// 				(y - 1 >= 0 &&
// 					!obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(grid[x][y - 1], 10),
// 					) &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x - direction.x][y - 1],
// 							10,
// 						),
// 					))
// 			) {
// 				return {
// 					point: newPoint,
// 					costSoFar: 0,
// 					heuristic: 0,
// 					toFinish: 0,
// 					parent: node,
// 					xGrid: x,
// 					yGrid: y,
// 				};
// 			}
// 		} else if (direction.y !== 0) {
// 			// Vertical
// 			if (
// 				(x + 1 < grid.length &&
// 					!obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(grid[x + 1][y], 10),
// 					) &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x + 1][y - direction.y],
// 							10,
// 						),
// 					)) ||
// 				(x - 1 >= 0 &&
// 					!obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(grid[x - 1][y], 10),
// 					) &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x - 1][y - direction.y],
// 							10,
// 						),
// 					))
// 			) {
// 				return {
// 					point: newPoint,
// 					costSoFar: 0,
// 					heuristic: 0,
// 					toFinish: 0,
// 					parent: node,
// 					xGrid: x,
// 					yGrid: y,
// 				};
// 			}
// 		}

// 		// Check for forced neighbors based on the condition from the screenshot
// 		if (direction.x !== 0) {
// 			// Horizontal
// 			if (
// 				(y + 1 < grid[0].length &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x - direction.x][y + 1],
// 							10,
// 						),
// 					)) ||
// 				(y - 1 >= 0 &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x - direction.x][y - 1],
// 							10,
// 						),
// 					))
// 			) {
// 				return {
// 					point: newPoint,
// 					costSoFar: 0,
// 					heuristic: 0,
// 					toFinish: 0,
// 					parent: node,
// 					xGrid: x,
// 					yGrid: y,
// 				};
// 			}
// 		} else if (direction.y !== 0) {
// 			// Vertical
// 			if (
// 				(x + 1 < grid.length &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x + 1][y - direction.y],
// 							10,
// 						),
// 					)) ||
// 				(x - 1 >= 0 &&
// 					obstacles.some(obstacle =>
// 						obstacle.isAlmostInside(
// 							grid[x - 1][y - direction.y],
// 							10,
// 						),
// 					))
// 			) {
// 				return {
// 					point: newPoint,
// 					costSoFar: 0,
// 					heuristic: 0,
// 					toFinish: 0,
// 					parent: node,
// 					xGrid: x,
// 					yGrid: y,
// 				};
// 			}
// 		}
// 	}
// }

// function getNeighborsJPS(
// 	node: Node,
// 	grid: Point[][],
// 	end: Point,
// 	obstacles: Mbr[],
// ): Node[] {
// 	const neighbors: Node[] = [];
// 	const directions = [
// 		{ x: -1, y: 0 }, // left
// 		{ x: 1, y: 0 }, // right
// 		{ x: 0, y: -1 }, // up
// 		{ x: 0, y: 1 }, // down
// 	];

// 	for (const direction of directions) {
// 		const jumpNode = jump(grid, node, direction, end, obstacles);
// 		if (jumpNode) {
// 			neighbors.push(jumpNode);
// 		}
// 	}

// 	return neighbors;
// }

function findPath(
	start: Point,
	end: Point,
	grid: Point[][],
	obstacles: Mbr[],
	newStart?: ControlPoint,
	newEnd?: ControlPoint
): Point[] | undefined {
	const startIdx = grid.findIndex(row => row.some(point => point.barelyEqual(start)));
	const endIdx = grid.findIndex(row => row.some(point => point.barelyEqual(end)));

	if (startIdx === -1 || endIdx === -1) {
		throw new Error('Start or end point not found in the grid');
	}

	const startPointIdx = grid[startIdx].findIndex(point => point.barelyEqual(start));
	const endPointIdx = grid[endIdx].findIndex(point => point.barelyEqual(end));

	const endNode: Node = {
		point: end,
		xGrid: endIdx,
		yGrid: endPointIdx,
		costSoFar: 0,
		heuristic: 0,
		toFinish: 0,
	};

	const startNode: Node = {
		point: start,
		costSoFar: 0,
		heuristic: heuristic(
			{ point: start, xGrid: startIdx, yGrid: startPointIdx } as Node,
			endNode
		),
		toFinish: heuristic(
			{ point: start, xGrid: startIdx, yGrid: startPointIdx } as Node,
			endNode
		),
		xGrid: startIdx,
		yGrid: startPointIdx,
	};
	const openSet: Node[] = [startNode];
	const closedSet: Set<Point> = new Set();

	while (openSet.length > 0) {
		openSet.sort((aa, bb) => aa.toFinish - bb.toFinish);
		const current = openSet.shift()!;
		if (current.point.barelyEqual(end)) {
			const path = reconstructPath(current);
			return path;
		}

		closedSet.add(current.point);
		const neighbors = getNeighbors(current, grid, obstacles);
		// TODO replace with JumpPointSearch
		// const neighbors = getNeighborsJPS(current, grid, end, obstacles);

		for (const neighbor of neighbors) {
			if (closedSet.has(neighbor.point)) {
				continue;
			}

			const extraCost = isChangingDirection(current, neighbor, newStart, newEnd);
			const tentativeCost = current.costSoFar + 1;

			if (
				!openSet.some(
					node =>
						node.point.barelyEqual(neighbor.point) && node.costSoFar <= tentativeCost
				)
			) {
				neighbor.costSoFar = tentativeCost + extraCost;
				neighbor.heuristic = heuristic(neighbor, endNode);
				neighbor.toFinish = neighbor.costSoFar + neighbor.heuristic;
				openSet.push(neighbor);
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
	const pathPoints: Point[] = [];

	for (let i = 0; i < points.length - 1; i += 1) {
		const segmentPath = findPath(points[i], points[i + 1], grid, obstacles, newStart, newEnd);

		if (segmentPath) {
			pathPoints.push(...segmentPath.slice(0, -1));
		} else {
			// If the segmentPath is invalid, remove the current point from the points array
			points.splice(i + 1, 1);
			i--;
		}
	}

	if (pathPoints.length !== 0) {
		pathPoints.push(points[points.length - 1]);
	}

	return pathPoints;
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
			// Remove the loop by slicing the result array
			const loopStartIndex = uniquePoints.get(key)!;
			result.splice(loopStartIndex + 1);
		} else {
			uniquePoints.set(key, result.length);
			result.push(point);
		}
	}

	return result;
}

function getLines(pathPoints: Point[]): Line[] {
	const lines: Line[] = [];
	const reducedPoints = reducePoints(pathPoints);
	let startPoint = reducedPoints[0];

	for (let i = 1; i < reducedPoints.length - 1; i += 1) {
		const prevPoint = reducedPoints[i - 1];
		const currPoint = reducedPoints[i];
		const nextPoint = reducedPoints[i + 1];

		// Check if the direction changes
		if (prevPoint.x !== nextPoint.x && prevPoint.y !== nextPoint.y) {
			lines.push(new Line(startPoint, currPoint));
			startPoint = currPoint;
		}
	}

	if (lines.length > 0) {
		lines.push(new Line(startPoint, pathPoints[pathPoints.length - 1]));
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

export function findOrthogonalPath(
	start: ControlPoint,
	end: ControlPoint,
	obstacles: Mbr[],
	toVisitPoints: Point[] = []
): { lines: Line[]; newStart?: ControlPoint; newEnd?: ControlPoint } {
	const { grid, newStart, newEnd, middlePoint } = createGrid(start, end, toVisitPoints);

	const startPoint = newStart ? newStart : start;
	const endPoint = newEnd ? newEnd : end;

	const centerLine = findCenterLine(grid, startPoint, endPoint, middlePoint);
	const adjustedCenterLine =
		centerLine.length > 0
			? startPoint.getDistance(centerLine[0]) <
			  startPoint.getDistance(centerLine[centerLine.length - 1])
				? centerLine
				: centerLine.reverse()
			: centerLine;

	const points = [
		startPoint,
		...(toVisitPoints.length > 0 ? toVisitPoints : adjustedCenterLine),
		endPoint,
	];

	const pathPoints = findPathPoints(points, grid, obstacles, newStart, newEnd);
	return {
		lines: getLines(pathPoints),
		newStart,
		newEnd,
	};
}
