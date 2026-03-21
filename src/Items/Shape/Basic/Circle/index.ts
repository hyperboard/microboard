import { Mbr } from 'Items/Mbr/Mbr';
import { CubicBezier } from 'Items/Curve/Curve';
import { Path } from 'Items/Path/Path';
import { Point } from 'Items/Point/Point';
import { Arc } from 'Items/Arc/Arc';

export const Circle = {
	name: 'Circle',
	textBounds: new Mbr(10, 20, 90, 80),
	path: new Path([new Arc(new Point(50, 50), 50, 50, 0, 2 * Math.PI)], true),
	anchorPoints: [new Point(0, 50), new Point(50, 0), new Point(100, 50), new Point(50, 100)],
	createPath: (mbr: Mbr) => Circle.path.copy(),
	useMbrUnderPointer: false,
};
