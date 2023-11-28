import { Line, Path } from "Board/Items";
import { ControlPoint, BoardPoint } from "../ControlPoint";

export function getOrthogonalLine(
	start: ControlPoint,
	end: ControlPoint,
	_middle: BoardPoint[],
): Path {
	return new Path([new Line(start, end)]);
}
