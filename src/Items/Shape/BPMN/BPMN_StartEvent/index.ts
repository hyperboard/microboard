import { Mbr } from 'Items/Mbr/Mbr';
import { Arc } from 'Items/Arc/Arc';
import { Path } from 'Items/Path/Path';
import { Point } from 'Items/Point/Point';

export const BPMN_StartEvent = {
	name: 'BPMN_StartEvent',
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Path(
		[new Arc(new Point(50, 50), 50, 50, 0, 2 * Math.PI)],
		true,
		'none',
		'black',
		'solid',
		2
	),
	anchorPoints: [new Point(0, 50), new Point(50, 0), new Point(100, 50), new Point(50, 100)],
	createPath: (mbr: Mbr) => BPMN_StartEvent.path.copy(),
	useMbrUnderPointer: false,
};
