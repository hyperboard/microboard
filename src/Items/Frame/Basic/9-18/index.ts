import { Mbr, Line, Path, Point } from "Board/Items";

export const Frame9x18 = {
	name: "9:18",
	textBounds: new Mbr(0, -10, 200, -1),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(200, 0)), // Увеличено вдвое
			new Line(new Point(200, 0), new Point(200, 400)), // Увеличено вдвое
			new Line(new Point(200, 400), new Point(0, 400)), // Увеличено вдвое
			new Line(new Point(0, 400), new Point(0, 0)), // Увеличено вдвое
		],
		true,
	),
	anchorPoints: [
		new Point(0, 200), // Увеличено вдвое
		new Point(200, 200), // Увеличено вдвое
		new Point(100, 0), // Увеличено вдвое
		new Point(100, 400), // Увеличено вдвое
	],
};
