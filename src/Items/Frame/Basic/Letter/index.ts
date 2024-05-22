import { Mbr, Line, Path, Point } from "Board/Items";

export const Letter = {
	name: "Letter",
	textBounds: new Mbr(0, -15, 100, -1),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(100, 100 * (1120 / 867))),
			new Line(
				new Point(100, 100 * (1120 / 867)),
				new Point(0, 100 * (1120 / 867)),
			),
			new Line(new Point(0, 100 * (1120 / 867)), new Point(0, 0)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50 * (1120 / 867)),
		new Point(100, 50 * (1120 / 867)),
		new Point(50, 0),
		new Point(50, 100 * (1120 / 867)),
	],
};
