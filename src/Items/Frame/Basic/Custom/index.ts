import { Mbr } from 'Geometry/Mbr';
import { Line } from 'Geometry/Line';
import { Path } from 'Geometry/Path';
import { Point } from 'Geometry/Point';

export const Custom = {
	name: 'Custom',
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
