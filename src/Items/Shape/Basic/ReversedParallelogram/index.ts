import { Mbr, Line, Path, Point } from "Board/Items";

export const ReversedParallelogram = {
	name: "ReversedParallelogram",
	textBounds: new Mbr(10, 5, 90, 95),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(90, 0)),
			new Line(new Point(90, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(10, 100)),
			new Line(new Point(10, 100), new Point(0, 0)),
		],
		true,
	),
	anchorPoints: [
		new Point(5, 50),
		new Point(45, 0),
		new Point(95, 50),
		new Point(55, 100),
	],
};
