import { Mbr, Path, Point, Arc, Paths } from "Board/Items";

export const BPMN_IntermediateEvent = {
	name: "BPMN_IntermediateEvent",
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Paths(
		[
			new Path(
				[new Arc(new Point(50, 50), 50, 50, 0, 2 * Math.PI)],
				true,
			),
			new Path(
				[new Arc(new Point(50, 50), 35, 35, 0, 2 * Math.PI)],
				true,
			),
		],
		"none",
		"black",
		"solid",
		2,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(50, 0),
		new Point(100, 50),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => BPMN_IntermediateEvent.path.copy(),
	useMbrUnderPointer: false,
};
