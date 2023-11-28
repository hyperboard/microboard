import { Mbr, Line, Path, Point } from "Board/Items";

export const Parallelogram = {
	name: "Parallelogram",
	textBounds: new Mbr(10, 5, 90, 95),
	path: new Path(
		[
			new Line(new Point(0, 100), new Point(10, 0)),
			new Line(new Point(10, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(90, 100)),
			new Line(new Point(90, 100), new Point(0, 100)),
		],
		true,
	),
	anchorPoints: [
		new Point(5, 50),
		new Point(55, 0),
		new Point(95, 50),
		new Point(45, 100),
	],
};
