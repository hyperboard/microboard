import { Mbr, Line, Path, Point } from "Board/Items";

export const Cross = {
	name: "Cross",
	textBounds: new Mbr(25, 25, 75, 75),
	path: new Path(
		[
			new Line(new Point(0, 25), new Point(25, 25)),
			new Line(new Point(25, 25), new Point(25, 0)),
			new Line(new Point(25, 0), new Point(75, 0)),
			new Line(new Point(75, 0), new Point(75, 25)),
			new Line(new Point(75, 25), new Point(100, 25)),
			new Line(new Point(100, 25), new Point(100, 75)),
			new Line(new Point(100, 75), new Point(75, 75)),
			new Line(new Point(75, 75), new Point(75, 100)),
			new Line(new Point(75, 100), new Point(25, 100)),
			new Line(new Point(25, 100), new Point(25, 75)),
			new Line(new Point(25, 75), new Point(0, 75)),
			new Line(new Point(0, 75), new Point(0, 25)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(50, 0),
		new Point(100, 50),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => Cross.path.copy(),
};
