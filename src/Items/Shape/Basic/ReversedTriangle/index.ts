import { Mbr, Line, Path, Point } from "Board/Items";

export const ReversedTriangle = {
	name: "ReversedTriangle",
	textBounds: new Mbr(25, 50, 75, 95),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(50, 100)),
			new Line(new Point(50, 100), new Point(0, 0)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 0),
		new Point(50, 0),
		new Point(25, 50),
		new Point(50, 100),
		new Point(75, 50),
		new Point(100, 0),
	],
	createPath: (mbr: Mbr) => ReversedTriangle.path.copy(),
};
