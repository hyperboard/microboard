import { Mbr } from 'Geometry/Mbr/Mbr';
import { Path } from 'Geometry/Path/Path';
import { Line } from 'Geometry/Line/Line';
import { Point } from 'Geometry/Point/Point';

export const ArrowBlockRight = {
	name: 'ArrowBlockRight',
	textBounds: new Mbr(30, 30, 85, 70),
	path: new Path(
		[
			new Line(new Point(100, 50), new Point(80, 0)),
			new Line(new Point(80, 0), new Point(0, 0)),
			new Line(new Point(0, 0), new Point(20, 50)),
			new Line(new Point(20, 50), new Point(0, 100)),
			new Line(new Point(0, 100), new Point(80, 100)),
			new Line(new Point(80, 100), new Point(100, 50)),
		],
		true
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(10, 25),
		new Point(10, 75),
		new Point(20, 0),
		new Point(60, 0),
		new Point(20, 100),
		new Point(60, 100),
		new Point(100, 0),
		new Point(100, 100),
		new Point(90, 25),
		new Point(90, 75),
		new Point(80, 50),
	],
	createPath: (mbr: Mbr) => ArrowBlockRight.path.copy(),
	useMbrUnderPointer: false,
};
