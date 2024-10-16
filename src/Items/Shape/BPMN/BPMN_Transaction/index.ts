import { Mbr, CubicBezier, Line, Path, Point, Paths } from "Board/Items";

export const BPMN_Transaction = {
	name: "BPMN_Transaction",
	textBounds: new Mbr(30, 30, 70, 70),
	path: new Paths(
		[
			new Path(
				[
					new CubicBezier(
						new Point(0, 10),
						new Point(0, 5),
						new Point(10, 0),
						new Point(5, 0),
					),
					new Line(new Point(10, 0), new Point(90, 0)),
					new CubicBezier(
						new Point(90, 0),
						new Point(95, 0),
						new Point(100, 10),
						new Point(100, 5),
					),
					new Line(new Point(100, 10), new Point(100, 90)),
					new CubicBezier(
						new Point(100, 90),
						new Point(100, 95),
						new Point(90, 100),
						new Point(95, 100),
					),
					new Line(new Point(90, 100), new Point(10, 100)),
					new CubicBezier(
						new Point(10, 100),
						new Point(5, 100),
						new Point(0, 90),
						new Point(0, 95),
					),
					new Line(new Point(0, 90), new Point(0, 10)),
				],
				true,
			),
			new Path(
				[
					new CubicBezier(
						new Point(20, 30),
						new Point(20, 25),
						new Point(30, 20),
						new Point(25, 20),
					),
					new Line(new Point(30, 20), new Point(70, 20)),
					new CubicBezier(
						new Point(70, 20),
						new Point(75, 20),
						new Point(80, 30),
						new Point(80, 25),
					),
					new Line(new Point(80, 30), new Point(80, 70)),
					new CubicBezier(
						new Point(80, 70),
						new Point(80, 75),
						new Point(70, 80),
						new Point(75, 80),
					),
					new Line(new Point(70, 80), new Point(30, 80)),
					new CubicBezier(
						new Point(30, 80),
						new Point(25, 80),
						new Point(20, 70),
						new Point(20, 75),
					),
					new Line(new Point(20, 70), new Point(20, 30)),
				],
				false,
			),
		],
		"none",
		"black",
		"solid",
		3,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => createBPMN_TransactionPath(mbr).copy(),
};

const convexity = 2;
const nearBreakpoint = 10;
const farBreakpoint = 20;
const secondNearBreakpoint = 30;
const secondFarBreakpoint = 40;

export const createBPMN_TransactionPath = (mbr: Mbr) => {
	let ratio = mbr.getWidth() / mbr.getHeight();

	if (ratio >= 1) {
		const quotientFarBreakpoint = farBreakpoint / ratio;
		const quotientNearBreakpoint = nearBreakpoint / ratio;
		const secondQuotientFarBreakpoint = farBreakpoint / ratio + 20;
		const secondQuotientNearBreakpoint = nearBreakpoint / ratio + 20;
		const quotientConvexity = convexity / ratio;
		return new Paths(
			[
				new Path(
					[
						new CubicBezier(
							new Point(0, farBreakpoint),
							new Point(0, nearBreakpoint - convexity),
							new Point(quotientFarBreakpoint, 0),
							new Point(
								quotientNearBreakpoint - quotientConvexity,
								0,
							),
						),
						new Line(
							new Point(quotientFarBreakpoint, 0),
							new Point(100 - quotientFarBreakpoint, 0),
						),
						new CubicBezier(
							new Point(100 - quotientFarBreakpoint, 0),
							new Point(
								100 -
									quotientNearBreakpoint +
									quotientConvexity,
								0,
							),
							new Point(100, farBreakpoint),
							new Point(100, nearBreakpoint - convexity),
						),
						new Line(
							new Point(100, farBreakpoint),
							new Point(100, 100 - farBreakpoint),
						),
						new CubicBezier(
							new Point(100, 100 - farBreakpoint),
							new Point(100, 100 - nearBreakpoint - convexity),
							new Point(100 - quotientFarBreakpoint, 100),
							new Point(
								100 -
									quotientNearBreakpoint +
									quotientConvexity,
								100,
							),
						),
						new Line(
							new Point(100 - quotientFarBreakpoint, 100),
							new Point(quotientFarBreakpoint, 100),
						),
						new CubicBezier(
							new Point(quotientFarBreakpoint, 100),
							new Point(
								quotientNearBreakpoint - quotientConvexity,
								100,
							),
							new Point(0, 100 - farBreakpoint),
							new Point(0, 100 - nearBreakpoint - convexity),
						),
						new Line(
							new Point(0, 100 - farBreakpoint),
							new Point(0, farBreakpoint),
						),
					],
					true,
				),
				new Path(
					[
						new CubicBezier(
							new Point(20, secondFarBreakpoint),
							new Point(20, secondNearBreakpoint - convexity),
							new Point(secondQuotientFarBreakpoint, 20),
							new Point(
								secondQuotientNearBreakpoint -
									quotientConvexity,
								20,
							),
						),
						new Line(
							new Point(secondQuotientFarBreakpoint, 20),
							new Point(80 - quotientFarBreakpoint, 20),
						),
						new CubicBezier(
							new Point(80 - secondQuotientFarBreakpoint, 20),
							new Point(
								80 - quotientNearBreakpoint + quotientConvexity,
								20,
							),
							new Point(80, secondFarBreakpoint),
							new Point(80, secondNearBreakpoint - convexity),
						),
						new Line(
							new Point(80, secondFarBreakpoint),
							new Point(80, 80 - farBreakpoint),
						),
						new CubicBezier(
							new Point(80, 80 - farBreakpoint),
							new Point(80, 80 - nearBreakpoint - convexity),
							new Point(80 - quotientFarBreakpoint, 80),
							new Point(
								80 - quotientNearBreakpoint + quotientConvexity,
								80,
							),
						),
						new Line(
							new Point(80 - quotientFarBreakpoint, 80),
							new Point(secondQuotientFarBreakpoint, 80),
						),
						new CubicBezier(
							new Point(secondQuotientFarBreakpoint, 80),
							new Point(
								secondQuotientNearBreakpoint -
									quotientConvexity,
								80,
							),
							new Point(20, 80 - farBreakpoint),
							new Point(20, 80 - nearBreakpoint - convexity),
						),
						new Line(
							new Point(20, 80 - farBreakpoint),
							new Point(20, secondFarBreakpoint),
						),
					],
					false,
				),
			],
			"none",
			"black",
			"solid",
			3,
		);
	}

	ratio = mbr.getHeight() / mbr.getWidth();
	const quotientFarBreakpoint = farBreakpoint / ratio;
	const quotientNearBreakpoint = nearBreakpoint / ratio;
	const secondQuotientFarBreakpoint = farBreakpoint / ratio + 20;
	const secondQuotientNearBreakpoint = nearBreakpoint / ratio + 20;
	const quotientConvexity = convexity / ratio;
	return new Paths(
		[
			new Path(
				[
					new CubicBezier(
						new Point(0, quotientFarBreakpoint),
						new Point(
							0,
							quotientNearBreakpoint - quotientConvexity,
						),
						new Point(farBreakpoint, 0),
						new Point(nearBreakpoint - convexity, 0),
					),
					new Line(
						new Point(farBreakpoint, 0),
						new Point(100 - farBreakpoint, 0),
					),
					new CubicBezier(
						new Point(100 - farBreakpoint, 0),
						new Point(100 - nearBreakpoint + convexity, 0),
						new Point(100, quotientFarBreakpoint),
						new Point(
							100,
							quotientNearBreakpoint - quotientConvexity,
						),
					),
					new Line(
						new Point(100, quotientFarBreakpoint),
						new Point(100, 100 - quotientFarBreakpoint),
					),
					new CubicBezier(
						new Point(100, 100 - quotientFarBreakpoint),
						new Point(
							100,
							100 - quotientNearBreakpoint - quotientConvexity,
						),
						new Point(100 - farBreakpoint, 100),
						new Point(100 - nearBreakpoint + convexity, 100),
					),
					new Line(
						new Point(100 - farBreakpoint, 100),
						new Point(farBreakpoint, 100),
					),
					new CubicBezier(
						new Point(farBreakpoint, 100),
						new Point(nearBreakpoint - convexity, 100),
						new Point(0, 100 - quotientFarBreakpoint),
						new Point(
							0,
							100 - quotientNearBreakpoint - quotientConvexity,
						),
					),
					new Line(
						new Point(0, 100 - quotientFarBreakpoint),
						new Point(0, quotientFarBreakpoint),
					),
				],
				true,
			),
			new Path(
				[
					new CubicBezier(
						new Point(20, secondQuotientFarBreakpoint),
						new Point(
							20,
							secondQuotientNearBreakpoint - quotientConvexity,
						),
						new Point(secondFarBreakpoint, 20),
						new Point(secondNearBreakpoint - convexity, 20),
					),
					new Line(
						new Point(secondFarBreakpoint, 20),
						new Point(80 - farBreakpoint, 20),
					),
					new CubicBezier(
						new Point(80 - farBreakpoint, 20),
						new Point(80 - nearBreakpoint + convexity, 20),
						new Point(80, secondQuotientFarBreakpoint),
						new Point(
							80,
							secondQuotientNearBreakpoint - quotientConvexity,
						),
					),
					new Line(
						new Point(80, secondQuotientFarBreakpoint),
						new Point(80, 80 - quotientFarBreakpoint),
					),
					new CubicBezier(
						new Point(80, 80 - quotientFarBreakpoint),
						new Point(
							80,
							80 - quotientNearBreakpoint - quotientConvexity,
						),
						new Point(80 - farBreakpoint, 80),
						new Point(80 - nearBreakpoint + convexity, 80),
					),
					new Line(
						new Point(80 - farBreakpoint, 80),
						new Point(secondFarBreakpoint, 80),
					),
					new CubicBezier(
						new Point(secondFarBreakpoint, 80),
						new Point(secondNearBreakpoint - convexity, 80),
						new Point(20, 80 - quotientFarBreakpoint),
						new Point(
							20,
							80 - quotientNearBreakpoint - quotientConvexity,
						),
					),
					new Line(
						new Point(20, 80 - quotientFarBreakpoint),
						new Point(20, secondQuotientFarBreakpoint),
					),
				],
				false,
			),
		],
		"none",
		"black",
		"solid",
		3,
	);
};
