import { Mbr } from 'Geometry/Mbr/Mbr';
import { Line } from 'Geometry/Line/Line';
import { Path } from 'Geometry/Path/Path';
import { Point } from 'Geometry/Point/Point';

export const Trapezoid = {
	name: 'Trapezoid',
	textBounds: new Mbr(20, 5, 80, 95),
	path: new Path(
		[
			new Line(new Point(0, 100), new Point(20, 0)),
			new Line(new Point(20, 0), new Point(80, 0)),
			new Line(new Point(80, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(0, 100)),
		],
		true
	),
	anchorPoints: [new Point(10, 50), new Point(55, 0), new Point(90, 50), new Point(45, 100)],
	createPath: (mbr: Mbr) => Trapezoid.path.copy(),
	useMbrUnderPointer: false,
};
