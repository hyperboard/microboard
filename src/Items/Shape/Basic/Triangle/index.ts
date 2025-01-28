import { Mbr, Line, Path, Point } from "Board/Items";

export const Triangle = {
	name: "Triangle",
	textBounds: new Mbr(25, 50, 75, 95),
	path: new Path(
		[
			new Line(new Point(0, 100), new Point(50, 0)),
			new Line(new Point(50, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(0, 100)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 100),
		new Point(25, 50),
		new Point(50, 0),
		new Point(75, 50),
		new Point(100, 100),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => Triangle.path.copy(),
	useMbrUnderPointer: false,
};
