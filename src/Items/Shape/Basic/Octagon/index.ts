import { Mbr, Line, Path, Point } from 'Items';

export const Octagon = {
	name: 'Ocatagon',
	textBounds: new Mbr(10, 15, 90, 85),
	path: new Path(
		[
			new Line(new Point(0, 25), new Point(25, 0)),
			new Line(new Point(25, 0), new Point(75, 0)),
			new Line(new Point(75, 0), new Point(100, 25)),
			new Line(new Point(100, 25), new Point(100, 75)),
			new Line(new Point(100, 75), new Point(75, 100)),
			new Line(new Point(75, 100), new Point(25, 100)),
			new Line(new Point(25, 100), new Point(0, 75)),
			new Line(new Point(0, 75), new Point(0, 25)),
		],
		true
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(12, 12),
		new Point(50, 0),
		new Point(88, 12),
		new Point(100, 50),
		new Point(88, 88),
		new Point(50, 100),
		new Point(12, 88),
	],
	createPath: (mbr: Mbr) => Octagon.path.copy(),
	useMbrUnderPointer: false,
};
