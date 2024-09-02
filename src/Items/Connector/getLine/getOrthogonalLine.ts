import { Line, Mbr, Path } from "Board/Items";
import { ControlPoint, BoardPoint } from "../ControlPoint";
import { findOrthogonalPath } from "./findOrthogonalPath";

export function getOrthogonalLine(
	start: ControlPoint,
	end: ControlPoint,
	_middle: BoardPoint[],
	skipObstacles = false,
): Path {
	const obstacles: Mbr[] = [];
	if (start.pointType !== "Board" && !skipObstacles) {
		obstacles.push(start.item.getMbr());
	}
	if (end.pointType !== "Board" && !skipObstacles) {
		obstacles.push(end.item.getMbr());
	}

	const { lines, newStart, newEnd } = findOrthogonalPath(
		start,
		end,
		obstacles,
	);

	if (lines.length === 0) {
		if (obstacles.length > 0) {
			return getOrthogonalLine(start, end, _middle, true);
		}
		return new Path([
			new Line(newStart ? newStart : start, newEnd ? newEnd : end),
		]);
	}
	return new Path(lines);
}
