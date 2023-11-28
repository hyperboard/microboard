import { Mbr, Line, Path, Point } from "Board/Items";

export const Hexagon = {
	name: "Hexagon",
	textBounds: new Mbr(15, 20, 85, 80),
	path: new Path(
		[
			new Line(new Point(0, 50), new Point(25, 0)),
			new Line(new Point(25, 0), new Point(75, 0)),
			new Line(new Point(75, 0), new Point(100, 50)),
			new Line(new Point(100, 50), new Point(75, 100)),
			new Line(new Point(75, 100), new Point(25, 100)),
			new Line(new Point(25, 100), new Point(0, 50)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(12, 25),
		new Point(50, 0),
		new Point(88, 25),
		new Point(100, 50),
		new Point(88, 75),
		new Point(50, 100),
		new Point(12, 75),
	],
};
