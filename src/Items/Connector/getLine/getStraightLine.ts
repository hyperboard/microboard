import { Line, Path } from "Board/Items";
import { ControlPoint, BoardPoint } from "../ControlPoint";

export function getStraightLine(
	start: ControlPoint,
	end: ControlPoint,
	middle: BoardPoint[],
): Path {
	const segments: Line[] = [];
	if (middle.length === 0) {
		segments.push(new Line(start, end));
	} else {
		for (const point of middle) {
			end = point;
			segments.push(new Line(start, end));
			start = end;
		}
		segments.push(new Line(start, end));
	}
	return new Path(segments);
}
