import { Mbr, CubicBezier, Path, Point } from "Board/Items";

export const Cloud = {
	name: "Cloud",
	textBounds: new Mbr(20, 20, 80, 80),
	path: new Path(
		[
			new CubicBezier(
				new Point(0, 50),
				new Point(0, 40),
				new Point(15, 35),
				new Point(5, 35),
			),
			new CubicBezier(
				new Point(15, 35),
				new Point(15, 35),
				new Point(15, 15),
				new Point(5, 25),
			),
			new CubicBezier(
				new Point(15, 15),
				new Point(25, 5),
				new Point(35, 15),
				new Point(35, 15),
			),
			new CubicBezier(
				new Point(35, 15),
				new Point(35, 10),
				new Point(50, 0),
				new Point(40, 0),
			),
			new CubicBezier(
				new Point(50, 0),
				new Point(60, 0),
				new Point(65, 15),
				new Point(65, 10),
			),
			new CubicBezier(
				new Point(65, 15),
				new Point(65, 15),
				new Point(85, 15),
				new Point(75, 5),
			),
			new CubicBezier(
				new Point(85, 15),
				new Point(95, 25),
				new Point(85, 35),
				new Point(85, 35),
			),
			new CubicBezier(
				new Point(85, 35),
				new Point(85, 35),
				new Point(100, 50),
				new Point(100, 35),
			),
			new CubicBezier(
				new Point(100, 50),
				new Point(100, 65),
				new Point(85, 65),
				new Point(85, 65),
			),
			new CubicBezier(
				new Point(85, 65),
				new Point(90, 65),
				new Point(85, 90),
				new Point(100, 80),
			),
			new CubicBezier(
				new Point(85, 90),
				new Point(70, 95),
				new Point(65, 85),
				new Point(65, 80),
			),
			new CubicBezier(
				new Point(65, 85),
				new Point(65, 90),
				new Point(50, 100),
				new Point(60, 100),
			),
			new CubicBezier(
				new Point(50, 100),
				new Point(40, 100),
				new Point(35, 85),
				new Point(35, 90),
			),
			new CubicBezier(
				new Point(35, 85),
				new Point(35, 90),
				new Point(15, 90),
				new Point(25, 95),
			),
			new CubicBezier(
				new Point(15, 90),
				new Point(0, 80),
				new Point(15, 65),
				new Point(10, 65),
			),
			new CubicBezier(
				new Point(15, 65),
				new Point(15, 65),
				new Point(0, 50),
				new Point(0, 65),
			),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(15, 15),
		new Point(50, 0),
		new Point(85, 15),
		new Point(100, 50),
		new Point(85, 90),
		new Point(50, 100),
		new Point(15, 90),
	],
};
