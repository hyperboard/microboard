import { Mbr, Path, Line, Point } from "Board/Items";

export const ArrowLeft = {
	name: "ArrowLeft",
	textBounds: new Mbr(25, 30, 95, 70),
	path: new Path(
		[
			new Line(new Point(100, 75), new Point(50, 75)),
			new Line(new Point(50, 75), new Point(50, 100)),
			new Line(new Point(50, 100), new Point(0, 50)),
			new Line(new Point(0, 50), new Point(50, 0)),
			new Line(new Point(50, 0), new Point(50, 25)),
			new Line(new Point(50, 25), new Point(100, 25)),
			new Line(new Point(100, 25), new Point(100, 75)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(25, 25),
		new Point(50, 0),
		new Point(75, 25),
		new Point(100, 50),
		new Point(75, 75),
		new Point(50, 100),
		new Point(25, 75),
	],
};
