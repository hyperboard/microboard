import { Mbr, Path, Line, Point } from "Board/Items";

export const ArrowLeftRight = {
	name: "ArrowLeftRight",
	textBounds: new Mbr(15, 30, 85, 70),
	path: new Path(
		[
			new Line(new Point(0, 50), new Point(25, 0)),
			new Line(new Point(25, 0), new Point(25, 25)),
			new Line(new Point(25, 25), new Point(75, 25)),
			new Line(new Point(75, 25), new Point(75, 0)),
			new Line(new Point(75, 0), new Point(100, 50)),
			new Line(new Point(100, 50), new Point(75, 100)),
			new Line(new Point(75, 100), new Point(75, 75)),
			new Line(new Point(75, 75), new Point(25, 75)),
			new Line(new Point(25, 75), new Point(25, 100)),
			new Line(new Point(25, 100), new Point(0, 50)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(25, 0),
		new Point(50, 25),
		new Point(75, 0),
		new Point(100, 50),
		new Point(75, 100),
		new Point(50, 75),
		new Point(25, 100),
	],
	createPath: (mbr: Mbr) => ArrowLeftRight.path.copy(),
};
