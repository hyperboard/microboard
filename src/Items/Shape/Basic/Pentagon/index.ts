import { Mbr, Line, Path, Point } from "Board/Items";

export const Pentagon = {
	name: "Pentagon",
	textBounds: new Mbr(20, 30, 80, 90),
	path: new Path(
		[
			new Line(new Point(0, 50), new Point(50, 0)),
			new Line(new Point(50, 0), new Point(100, 50)),
			new Line(new Point(100, 50), new Point(75, 100)),
			new Line(new Point(75, 100), new Point(25, 100)),
			new Line(new Point(25, 100), new Point(0, 50)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 35),
		new Point(50, 0),
		new Point(100, 35),
		new Point(90, 95),
		new Point(10, 95),
	],
};
