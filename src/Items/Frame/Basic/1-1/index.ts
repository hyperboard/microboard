import { Mbr } from 'Items/Mbr';
import { Line } from 'Items/Line';
import { Path } from 'Items/Path';
import { Point } from 'Items/Point';

export const Frame1x1 = {
	name: '1:1',
	textBounds: new Mbr(0, -10, 100, -1),
	get path() {
		return new Path(
		[
			new Line(new Point(0, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(0, 100)),
			new Line(new Point(0, 100), new Point(0, 0)),
		],
		true
		);
	},
	anchorPoints: [new Point(0, 50), new Point(100, 50), new Point(50, 0), new Point(50, 100)],
};
