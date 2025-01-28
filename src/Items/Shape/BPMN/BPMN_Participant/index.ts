import { Mbr, Line, Path, Point, Paths } from "Board/Items";

export const BPMN_Participant = {
	name: "BPMN_Participant",
	textBounds: new Mbr(2, 5, 18, 95),
	path: new Paths(
		[
			new Path(
				[
					new Line(new Point(0, 0), new Point(100, 0)),
					new Line(new Point(100, 0), new Point(100, 100)),
					new Line(new Point(100, 100), new Point(0, 100)),
					new Line(new Point(0, 100), new Point(0, 0)),
				],
				true,
			),
			new Path([new Line(new Point(20, 0), new Point(20, 100))], false),
		],
		"none",
		"black",
		"solid",
		2,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => BPMN_Participant.path.copy(),
	useMbrUnderPointer: false,
};
