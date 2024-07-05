import { Mbr, Line, Path, Point } from "Board/Items";

export const Hexagon = {
	name: "Hexagon",
	textBounds: new Mbr(15, 20, 85, 80),
	path: new Path(
		[
			new Line(new Point(50, 0), new Point(100, 25)),
			new Line(new Point(100, 25), new Point(100, 75)),
			new Line(new Point(100, 75), new Point(50, 100)),
			new Line(new Point(50, 100), new Point(0, 75)),
			new Line(new Point(0, 75), new Point(0, 25)),
			new Line(new Point(0, 25), new Point(50, 0)),
		],
		true,
	),
	anchorPoints: [
		new Point(50, 0),
		new Point(75, 12),
		new Point(100, 50),
		new Point(75, 88),
		new Point(50, 100),
		new Point(25, 88),
		new Point(0, 50),
		new Point(25, 12),
	],
};
