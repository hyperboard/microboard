import { Mbr, Path, Point, Arc } from "Board/Items";

export const BPMN_StartEvent = {
	name: "BPMN_StartEvent",
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Path(
		[new Arc(new Point(50, 50), 50, 50, 0, 2 * Math.PI)],
		true,
		"none",
		"black",
		"solid",
		3,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(50, 0),
		new Point(100, 50),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => BPMN_StartEvent.path.copy(),
};
