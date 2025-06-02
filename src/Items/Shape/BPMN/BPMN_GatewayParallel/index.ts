import { Mbr, Line, Path, Point, Paths, CubicBezier } from 'Items';

export const BPMN_GatewayParallel = {
	name: 'BPMN_GatewayParallel',
	textBounds: new Mbr(0, 105, 100, 145),
	path: new Paths(
		[
			new Path(
				[
					new CubicBezier(
						new Point(2.02, 46.35),
						new Point(0, 48.37),
						new Point(2.02, 53.65),
						new Point(0, 51.63)
					),
					new Line(new Point(2.02, 53.65), new Point(46.35, 97.98)),
					new CubicBezier(
						new Point(46.35, 97.98),
						new Point(48.37, 100),
						new Point(53.65, 97.98),
						new Point(51.63, 100)
					),
					new Line(new Point(53.65, 97.98), new Point(97.98, 53.65)),
					new CubicBezier(
						new Point(97.98, 53.65),
						new Point(100, 51.63),
						new Point(97.98, 46.35),
						new Point(100, 48.37)
					),
					new Line(new Point(97.98, 46.35), new Point(53.65, 2.02)),
					new CubicBezier(
						new Point(53.65, 2.02),
						new Point(51.63, 0),
						new Point(46.35, 2.02),
						new Point(48.37, 0)
					),
					new Line(new Point(46.35, 2.02), new Point(2.02, 46.35)),
					new Line(new Point(2.02, 46.35), new Point(2.02, 46.35)),
				],
				true
			),
			new Path([new Line(new Point(50, 20), new Point(50, 80))], false),
			new Path([new Line(new Point(20, 50), new Point(80, 50))], false),
		],
		'none',
		'black',
		'solid',
		2
	),
	anchorPoints: [new Point(0, 50), new Point(100, 50), new Point(50, 0), new Point(50, 100)],
	createPath: (mbr: Mbr) => BPMN_GatewayParallel.path.copy(),
	useMbrUnderPointer: false,
};
