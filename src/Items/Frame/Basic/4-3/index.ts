import { Mbr } from 'Geometry/Mbr';
import { Line } from 'Geometry/Line';
import { Path } from 'Geometry/Path';
import { Point } from 'Geometry/Point';

export const Frame4x3 = {
	name: '4:3',
	textBounds: new Mbr(0, -10, 200, -1),
	get path() {
		return new Path(
		[
			new Line(new Point(0, 0), new Point(200, 0)),
			new Line(new Point(200, 0), new Point(200, 200 * (853 / 1138))),
			new Line(new Point(200, 200 * (853 / 1138)), new Point(0, 200 * (853 / 1138))),
			new Line(new Point(0, 200 * (853 / 1138)), new Point(0, 0)),
		],
		true
		);
	},
	anchorPoints: [
		new Point(0, 100 * (853 / 1138)),
		new Point(200, 100 * (853 / 1138)),
		new Point(100, 0),
		new Point(100, 200 * (853 / 1138)),
	],
};
