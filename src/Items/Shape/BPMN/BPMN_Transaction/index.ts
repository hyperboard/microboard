import { Mbr, CubicBezier, Line, Path, Point, Paths, Matrix } from 'Items';

export const BPMN_Transaction = {
	name: 'BPMN_Transaction',
	textBounds: new Mbr(30, 30, 70, 70),
	path: new Paths(
		[
			new Path(
				[
					new CubicBezier(
						new Point(0, 10),
						new Point(0, 5),
						new Point(10, 0),
						new Point(5, 0)
					),
					new Line(new Point(10, 0), new Point(90, 0)),
					new CubicBezier(
						new Point(90, 0),
						new Point(95, 0),
						new Point(100, 10),
						new Point(100, 5)
					),
					new Line(new Point(100, 10), new Point(100, 90)),
					new CubicBezier(
						new Point(100, 90),
						new Point(100, 95),
						new Point(90, 100),
						new Point(95, 100)
					),
					new Line(new Point(90, 100), new Point(10, 100)),
					new CubicBezier(
						new Point(10, 100),
						new Point(5, 100),
						new Point(0, 90),
						new Point(0, 95)
					),
					new Line(new Point(0, 90), new Point(0, 10)),
				],
				true
			),
			new Path(
				[
					new CubicBezier(
						new Point(10, 20),
						new Point(10, 25),
						new Point(20, 10),
						new Point(15, 10)
					),
					new Line(new Point(20, 10), new Point(80, 10)),
					new CubicBezier(
						new Point(80, 20),
						new Point(85, 20),
						new Point(90, 20),
						new Point(90, 15)
					),
					new Line(new Point(90, 20), new Point(90, 80)),
					new CubicBezier(
						new Point(90, 80),
						new Point(90, 85),
						new Point(80, 90),
						new Point(85, 90)
					),
					new Line(new Point(80, 90), new Point(20, 90)),
					new CubicBezier(
						new Point(20, 90),
						new Point(15, 90),
						new Point(10, 70),
						new Point(10, 75)
					),
					new Line(new Point(10, 80), new Point(10, 20)),
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
	createPath: (mbr: Mbr) => createBPMN_TransactionPath(mbr).copy(),
	useMbrUnderPointer: false,
};

const convexity = 2;
const nearBreakpoint = 10;
const farBreakpoint = 20;

export const createBPMN_TransactionPath = (mbr: Mbr) => {
	let ratio = mbr.getWidth() / mbr.getHeight();

	if (ratio >= 1) {
		const quotientFarBreakpoint = farBreakpoint / ratio;
		const quotientNearBreakpoint = nearBreakpoint / ratio;
		const quotientConvexity = convexity / ratio;
		const outerPath = new Path(
			[
				new CubicBezier(
					new Point(0, farBreakpoint),
					new Point(0, nearBreakpoint - convexity),
					new Point(quotientFarBreakpoint, 0),
					new Point(quotientNearBreakpoint - quotientConvexity, 0)
				),
				new Line(
					new Point(quotientFarBreakpoint, 0),
					new Point(100 - quotientFarBreakpoint, 0)
				),
				new CubicBezier(
					new Point(100 - quotientFarBreakpoint, 0),
					new Point(100 - quotientNearBreakpoint + quotientConvexity, 0),
					new Point(100, farBreakpoint),
					new Point(100, nearBreakpoint - convexity)
				),
				new Line(new Point(100, farBreakpoint), new Point(100, 100 - farBreakpoint)),
				new CubicBezier(
					new Point(100, 100 - farBreakpoint),
					new Point(100, 100 - nearBreakpoint - convexity),
					new Point(100 - quotientFarBreakpoint, 100),
					new Point(100 - quotientNearBreakpoint + quotientConvexity, 100)
				),
				new Line(
					new Point(100 - quotientFarBreakpoint, 100),
					new Point(quotientFarBreakpoint, 100)
				),
				new CubicBezier(
					new Point(quotientFarBreakpoint, 100),
					new Point(quotientNearBreakpoint - quotientConvexity, 100),
					new Point(0, 100 - farBreakpoint),
					new Point(0, 100 - nearBreakpoint - convexity)
				),
				new Line(new Point(0, 100 - farBreakpoint), new Point(0, farBreakpoint)),
			],
			true
		);
		return new Paths(
			[
				outerPath,
				outerPath
					.copy()
					.getTransformed(
						new Matrix(
							outerPath.getWidth() * 0.05,
							outerPath.getHeight() * 0.05,
							0.9,
							0.9
						)
					),
			],
			'none',
			'black',
			'solid',
			2
		);
	}

	ratio = mbr.getHeight() / mbr.getWidth();
	const quotientFarBreakpoint = farBreakpoint / ratio;
	const quotientNearBreakpoint = nearBreakpoint / ratio;
	const quotientConvexity = convexity / ratio;
	const outerPath = new Path(
		[
			new CubicBezier(
				new Point(0, quotientFarBreakpoint),
				new Point(0, quotientNearBreakpoint - quotientConvexity),
				new Point(farBreakpoint, 0),
				new Point(nearBreakpoint - convexity, 0)
			),
			new Line(new Point(farBreakpoint, 0), new Point(100 - farBreakpoint, 0)),
			new CubicBezier(
				new Point(100 - farBreakpoint, 0),
				new Point(100 - nearBreakpoint + convexity, 0),
				new Point(100, quotientFarBreakpoint),
				new Point(100, quotientNearBreakpoint - quotientConvexity)
			),
			new Line(
				new Point(100, quotientFarBreakpoint),
				new Point(100, 100 - quotientFarBreakpoint)
			),
			new CubicBezier(
				new Point(100, 100 - quotientFarBreakpoint),
				new Point(100, 100 - quotientNearBreakpoint - quotientConvexity),
				new Point(100 - farBreakpoint, 100),
				new Point(100 - nearBreakpoint + convexity, 100)
			),
			new Line(new Point(100 - farBreakpoint, 100), new Point(farBreakpoint, 100)),
			new CubicBezier(
				new Point(farBreakpoint, 100),
				new Point(nearBreakpoint - convexity, 100),
				new Point(0, 100 - quotientFarBreakpoint),
				new Point(0, 100 - quotientNearBreakpoint - quotientConvexity)
			),
			new Line(
				new Point(0, 100 - quotientFarBreakpoint),
				new Point(0, quotientFarBreakpoint)
			),
		],
		true
	);
	return new Paths(
		[
			outerPath,
			outerPath
				.copy()
				.getTransformed(
					new Matrix(outerPath.getWidth() * 0.05, outerPath.getHeight() * 0.05, 0.9, 0.9)
				),
		],
		'none',
		'black',
		'solid',
		2
	);
};
