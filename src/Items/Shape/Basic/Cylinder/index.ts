import { Mbr, CubicBezier, Line, Path, Paths, Point } from 'Items';

export const Cylinder = {
	name: 'Cylinder',
	textBounds: new Mbr(5, 15, 95, 95),
	path: new Paths([
		new Path(
			[
				new CubicBezier(
					new Point(0, 5),
					new Point(0, 5),
					new Point(50, 0),
					new Point(0, 0)
				),
				new CubicBezier(
					new Point(50, 0),
					new Point(100, 0),
					new Point(100, 5),
					new Point(100, 5)
				),
				new Line(new Point(100, 5), new Point(100, 95)),
				new CubicBezier(
					new Point(100, 95),
					new Point(100, 95),
					new Point(50, 100),
					new Point(100, 100)
				),
				new CubicBezier(
					new Point(50, 100),
					new Point(0, 100),
					new Point(0, 95),
					new Point(0, 95)
				),
				new Line(new Point(0, 95), new Point(0, 5)),
			],
			true
		),
		new Path(
			[
				new CubicBezier(
					new Point(0, 5),
					new Point(0, 5),
					new Point(50, 10),
					new Point(0, 10)
				),
				new CubicBezier(
					new Point(50, 10),
					new Point(100, 10),
					new Point(100, 5),
					new Point(100, 5)
				),
			],
			false
		),
	]),
	anchorPoints: [new Point(0, 50), new Point(100, 50), new Point(50, 0), new Point(50, 100)],
	createPath: (mbr: Mbr) => Cylinder.path.copy(),
	useMbrUnderPointer: false,
};
