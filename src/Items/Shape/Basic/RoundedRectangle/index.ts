import { Mbr, CubicBezier, Line, Path, Point } from "Board/Items";

export const RoundedRectangle = {
	name: "RoundedRectangle",
	textBounds: new Mbr(5, 5, 95, 95),
	path: new Path(
		[
			new CubicBezier(
				new Point(0, 10),
				new Point(0, 5),
				new Point(10, 0),
				new Point(5, 0),
			),
			new Line(new Point(10, 0), new Point(90, 0)),
			new CubicBezier(
				new Point(90, 0),
				new Point(95, 0),
				new Point(100, 10),
				new Point(100, 5),
			),
			new Line(new Point(100, 10), new Point(100, 90)),
			new CubicBezier(
				new Point(100, 90),
				new Point(100, 95),
				new Point(90, 100),
				new Point(95, 100),
			),
			new Line(new Point(90, 100), new Point(10, 100)),
			new CubicBezier(
				new Point(10, 100),
				new Point(5, 100),
				new Point(0, 90),
				new Point(0, 95),
			),
			new Line(new Point(0, 90), new Point(0, 10)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
};
