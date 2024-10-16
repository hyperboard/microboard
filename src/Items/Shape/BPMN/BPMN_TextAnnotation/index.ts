import { Mbr, Line, Path, Point, Paths } from "Board/Items";

export const BPMN_TextAnnotation = {
	name: "BPMN_TextAnnotation",
	textBounds: new Mbr(54, 4, 95, 98),
	path: new Paths(
		[
			new Path(
				[
					new Line(new Point(80, 0), new Point(50, 0)),
					new Line(new Point(50, 0), new Point(50, 100)),
					new Line(new Point(50, 100), new Point(80, 100)),
				],
				false,
			),
		],
		"none",
		"black",
		"solid",
		3,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => BPMN_TextAnnotation.path.copy(),
};
