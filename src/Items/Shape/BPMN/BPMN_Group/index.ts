import { Mbr } from 'Geometry/Mbr/Mbr';
import { Line } from 'Geometry/Line/Line';
import { Path } from 'Geometry/Path/Path';
import { Point } from 'Geometry/Point/Point';

export const BPMN_Group = {
	name: 'BPMN_Group',
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(0, 100)),
			new Line(new Point(0, 100), new Point(0, 0)),
		],
		true,
		'none',
		'black',
		'dotDash',
		2
	),
	anchorPoints: [new Point(0, 50), new Point(100, 50), new Point(50, 0), new Point(50, 100)],
	createPath: (mbr: Mbr) => BPMN_Group.path.copy(),
	useMbrUnderPointer: false,
};
