import { Line, Path } from 'Items';
import { ControlPoint } from '../ControlPoint';

export function getStraightLine(
	start: ControlPoint,
	end: ControlPoint,
	middle: ControlPoint | null
): Path {
	const segments: Line[] = [];

	if (!middle) {
		segments.push(new Line(start, end));
	} else {
		segments.push(new Line(start, middle));
		segments.push(new Line(middle, end));
	}

	return new Path(segments);
}
