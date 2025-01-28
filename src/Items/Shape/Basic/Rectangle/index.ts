import { Mbr, Line, Path, Point } from "Board/Items";

export const Rectangle = {
	name: "Rectangle",
	textBounds: new Mbr(5, 5, 95, 95),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(0, 100)),
			new Line(new Point(0, 100), new Point(0, 0)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => Rectangle.path.copy(),
	useMbrUnderPointer: false,
};
