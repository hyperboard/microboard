import { Mbr, Line, Path, Point } from "Board/Items";

export const Rhombus = {
	name: "Rhombus",
	textBounds: new Mbr(25, 25, 75, 75),
	path: new Path(
		[
			new Line(new Point(0, 50), new Point(50, 0)),
			new Line(new Point(50, 0), new Point(100, 50)),
			new Line(new Point(100, 50), new Point(50, 100)),
			new Line(new Point(50, 100), new Point(0, 50)),
		],
		true,
	),
	anchorPoints: [
		new Point(25, 25),
		new Point(75, 25),
		new Point(75, 75),
		new Point(25, 75),
		new Point(0, 50),
		new Point(50, 0),
		new Point(100, 50),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => Rhombus.path.copy(),
	useMbrUnderPointer: false,
};
