import { Mbr, Line, Path, Point } from "Board/Items";

export const BPMN_DataObject = {
	name: "BPMN_DataObject",
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Path(
		[
			new Line(new Point(80, 0), new Point(0, 0)),
			new Line(new Point(0, 0), new Point(0, 100)),
			new Line(new Point(0, 100), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(100, 20)),
			new Line(new Point(100, 20), new Point(80, 20)),
			new Line(new Point(80, 20), new Point(80, 0)),
			new Line(new Point(80, 0), new Point(100, 20)),
		],
		true,
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
	createPath: (mbr: Mbr) => BPMN_DataObject.path.copy(),
};
