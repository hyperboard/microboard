import { Mbr, Line, Path, Paths, Point } from 'Items';

export const PredefinedProcess = {
	name: 'PredefinedProcess',
	textBounds: new Mbr(15, 5, 85, 95),
	path: new Paths([
		new Path(
			[
				new Line(new Point(0, 0), new Point(100, 0)),
				new Line(new Point(100, 0), new Point(100, 100)),
				new Line(new Point(100, 100), new Point(0, 100)),
				new Line(new Point(0, 100), new Point(0, 0)),
			],
			true
		),
		new Path([new Line(new Point(10, 0), new Point(10, 100))], false),
		new Path([new Line(new Point(90, 0), new Point(90, 100))], false),
	]),
	anchorPoints: [new Point(0, 50), new Point(100, 50), new Point(50, 0), new Point(50, 100)],
	createPath: (mbr: Mbr) => PredefinedProcess.path.copy(),
	useMbrUnderPointer: false,
};
