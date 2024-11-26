import { Mbr, Line, Path, Point, Paths } from "Board/Items";

export const BPMN_Annotation = {
	name: "BPMN_Annotation",
	textBounds: new Mbr(5, 5, 100, 95),
	path: new Paths(
		[
			new Path(
				[
					new Line(new Point(40, 0), new Point(0, 0)),
					new Line(new Point(0, 0), new Point(0, 100)),
					new Line(new Point(0, 100), new Point(40, 100)),
				],
				false,
			),
		],
		"none",
		"black",
		"solid",
		2,
	),
	anchorPoints: [],
	createPath: (mbr: Mbr) => BPMN_Annotation.path.copy(),
};
