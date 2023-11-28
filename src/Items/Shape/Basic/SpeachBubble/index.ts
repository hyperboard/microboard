import { Mbr, CubicBezier, Line, Path, Point } from "Board/Items";

export const SpeachBubble = {
	name: "SpeachBubble",
	textBounds: new Mbr(5, 5, 85, 85),
	path: new Path(
		[
			new CubicBezier(
				new Point(0, 10),
				new Point(0, 10),
				new Point(10, 0),
				new Point(0, 0),
			),
			new Line(new Point(10, 0), new Point(90, 0)),
			new CubicBezier(
				new Point(10, 0),
				new Point(90, 0),
				new Point(100, 10),
				new Point(100, 0),
			),
			new Line(new Point(100, 10), new Point(100, 80)),
			new CubicBezier(
				new Point(100, 80),
				new Point(100, 80),
				new Point(90, 90),
				new Point(100, 90),
			),
			new Line(new Point(90, 90), new Point(30, 90)),
			new Line(new Point(30, 90), new Point(20, 100)),
			new Line(new Point(20, 100), new Point(20, 90)),
			new Line(new Point(20, 90), new Point(10, 90)),
			new CubicBezier(
				new Point(10, 90),
				new Point(10, 90),
				new Point(0, 80),
				new Point(0, 90),
			),
			new Line(new Point(0, 80), new Point(0, 10)),
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
