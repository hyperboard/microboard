import { Mbr } from 'Geometry/Mbr/Mbr';
import { Path } from 'Geometry/Path/Path';
import { Line } from 'Geometry/Line/Line';
import { CubicBezier } from 'Geometry/Curve/Curve';
import { Point } from 'Geometry/Point/Point';

export const BracesLeft = {
	name: 'BracesLeft',
	textBounds: new Mbr(25, 5, 95, 95),
	path: new Path(
		[
			new CubicBezier(
				new Point(0, 100),
				new Point(0, 100),
				new Point(10, 90),
				new Point(10, 100)
			),
			new Line(new Point(10, 90), new Point(10, 55)),
			new Line(new Point(10, 55), new Point(20, 50)),
			new Line(new Point(20, 50), new Point(10, 45)),
			new Line(new Point(10, 45), new Point(10, 10)),
			new CubicBezier(
				new Point(10, 10),
				new Point(10, 10),
				new Point(0, 0),
				new Point(10, 0)
			),
		],
		false
	),
	anchorPoints: [],
	createPath: (mbr: Mbr) => BracesLeft.path.copy(),
	useMbrUnderPointer: true,
};
