import { Mbr, CubicBezier, Path, Point } from "Board/Items";

export const Circle = {
	name: "Circle",
	textBounds: new Mbr(10, 20, 90, 80),
	path: new Path(
		[
			new CubicBezier(
				new Point(0, 50),
				new Point(0, -18),
				new Point(100, 50),
				new Point(100, -18),
			),
			new CubicBezier(
				new Point(100, 50),
				new Point(100, 118),
				new Point(0, 50),
				new Point(0, 118),
			),
		],
		true,
	),
	anchorPoints: [
		new Point(-2, 50),
		new Point(50, 0),
		new Point(100, 50),
		new Point(50, 102),
	],
};
