import { Mbr, Path, Line, CubicBezier, Point } from "Board/Items";

export const BracesRight = {
	name: "BracesRight",
	textBounds: new Mbr(5, 5, 75, 95),
	path: new Path(
		[
			new CubicBezier(
				new Point(100, 0),
				new Point(100, 0),
				new Point(90, 10),
				new Point(90, 0),
			),
			new Line(new Point(90, 10), new Point(90, 45)),
			new Line(new Point(90, 45), new Point(80, 50)),
			new Line(new Point(80, 50), new Point(90, 55)),
			new Line(new Point(90, 55), new Point(90, 90)),
			new CubicBezier(
				new Point(90, 90),
				new Point(90, 90),
				new Point(100, 100),
				new Point(90, 100),
			),
		],
		false,
	),
	anchorPoints: [],
	createPath: (mbr: Mbr) => BracesRight.path.copy(),
};
