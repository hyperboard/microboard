import { Mbr } from 'Items/Mbr/Mbr';
import { Arc } from 'Items/Arc/Arc';
import { Path } from 'Items/Path/Path';
import { Paths } from 'Items/Path/Paths';
import { Point } from 'Items/Point/Point';

export const BPMN_IntermediateEventNoneInterrupting = {
	name: 'BPMN_IntermediateEventNoneInterrupting',
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Paths(
		[
			new Path([new Arc(new Point(50, 50), 50, 50, 0, 2 * Math.PI)], true),
			new Path([new Arc(new Point(50, 50), 35, 35, 0, 2 * Math.PI)]),
		],
		'none',
		'black',
		'dash',
		2
	),
	anchorPoints: [new Point(0, 50), new Point(50, 0), new Point(100, 50), new Point(50, 100)],
	createPath: (mbr: Mbr) => BPMN_IntermediateEventNoneInterrupting.path.copy(),
	useMbrUnderPointer: false,
};
