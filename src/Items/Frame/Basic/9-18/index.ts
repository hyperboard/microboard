import { Mbr } from 'Items/Mbr';
import { Line } from 'Items/Line';
import { Path } from 'Items/Path';
import { Point } from 'Items/Point';

export const Frame9x18 = {
	name: '9:18',
	textBounds: new Mbr(0, -10, 200, -1),
	get path() {
		return new Path(
		[
			new Line(new Point(0, 0), new Point(200, 0)),
			new Line(new Point(200, 0), new Point(200, 200 * (1230 / 612))),
			new Line(new Point(200, 200 * (1230 / 612)), new Point(0, 200 * (1230 / 612))),
			new Line(new Point(0, 200 * (1230 / 612)), new Point(0, 0)),
		],
		true
		);
	},
	anchorPoints: [
		new Point(0, 100 * (1230 / 612)),
		new Point(200, 100 * (1230 / 612)),
		new Point(100, 0),
		new Point(100, 200 * (1230 / 612)),
	],
};
