import { Mbr, Line, Path, Point, Paths, CubicBezier } from 'Items';

export const BPMN_DataStore = {
	name: 'BPMN_DataStore',
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Paths(
		[
			new Path(
				[
					new Line(new Point(0, 76.32), new Point(0, 23.68)),
					new CubicBezier(
						new Point(0, 23.68),
						new Point(0, 10.61),
						new Point(50, 0),
						new Point(22.39, 0)
					),
					new CubicBezier(
						new Point(50, 0),
						new Point(77.61, 0),
						new Point(100, 23.68),
						new Point(100, 10.61)
					),
					new Line(new Point(100, 23.68), new Point(100, 76.32)),
					new CubicBezier(
						new Point(100, 76.32),
						new Point(100, 89.39),
						new Point(50, 100),
						new Point(77.61, 100)
					),
					new CubicBezier(
						new Point(50, 100),
						new Point(22.39, 100),
						new Point(0, 76.32),
						new Point(0, 89.39)
					),
					new Line(new Point(0, 76.32), new Point(0, 76.32)),
				],
				true
			),
			new Path(
				[
					new CubicBezier(
						new Point(100, 23.68),
						new Point(100, 36.75),
						new Point(50, 47.36),
						new Point(77.61, 47.36)
					),
					new CubicBezier(
						new Point(50, 47.36),
						new Point(22.39, 47.36),
						new Point(0, 23.68),
						new Point(0, 36.75)
					),
				],
				false
			),
			new Path(
				[
					new CubicBezier(
						new Point(100, 50),
						new Point(100, 63.07),
						new Point(50, 73.68),
						new Point(77.61, 73.68)
					),
					new CubicBezier(
						new Point(50, 73.68),
						new Point(22.39, 73.68),
						new Point(0, 50),
						new Point(0, 63.07)
					),
				],
				false
			),
		],
		'none',
		'black',
		'solid',
		2
	),
	anchorPoints: [new Point(0, 50), new Point(100, 50), new Point(50, 0), new Point(50, 100)],
	createPath: (mbr: Mbr) => BPMN_DataStore.path.copy(),
	useMbrUnderPointer: false,
};
