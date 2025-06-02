import { Mbr, Line, Path, Point } from 'Items';

export const Star = {
	name: 'Star',
	textBounds: new Mbr(25, 40, 75, 75),
	path: new Path(
		[
			new Line(new Point(0, 35), new Point(35, 35)),
			new Line(new Point(35, 35), new Point(50, 0)),
			new Line(new Point(50, 0), new Point(65, 35)),
			new Line(new Point(65, 35), new Point(100, 35)),
			new Line(new Point(100, 35), new Point(75, 60)),
			new Line(new Point(75, 60), new Point(90, 95)),
			new Line(new Point(90, 95), new Point(50, 75)),
			new Line(new Point(50, 75), new Point(10, 95)),
			new Line(new Point(10, 95), new Point(25, 60)),
			new Line(new Point(25, 60), new Point(0, 35)),
		],
		true
	),
	anchorPoints: [
		new Point(20, 35),
		new Point(40, 20),
		new Point(60, 20),
		new Point(80, 35),
		new Point(85, 50),
		new Point(80, 75),
		new Point(70, 85),
		new Point(30, 85),
		new Point(20, 75),
		new Point(20, 50),
	],
	createPath: (mbr: Mbr) => Star.path.copy(),
	useMbrUnderPointer: false,
};
