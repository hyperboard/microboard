import { Mbr, Line, Path, Point } from "Board/Items";

export const Frame16x9 = {
	name: "16:9",
	textBounds: new Mbr(0, -10, 200, -1),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(200, 0)),
			new Line(new Point(200, 0), new Point(200, 200 * (739 / 1314))),
			new Line(
				new Point(200, 200 * (739 / 1314)),
				new Point(0, 200 * (739 / 1314)),
			),
			new Line(new Point(0, 200 * (739 / 1314)), new Point(0, 0)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 100 * (739 / 1314)),
		new Point(200, 100 * (739 / 1314)),
		new Point(100, 0),
		new Point(100, 200 * (739 / 1314)),
	],
};
