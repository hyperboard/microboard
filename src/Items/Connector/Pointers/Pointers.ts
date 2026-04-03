import { CubicBezier } from 'Geometry/Curve/Curve';
import { Line } from 'Geometry/Line/Line';
import { Path } from 'Geometry/Path/Path';
import { Paths } from 'Geometry/Path/Paths';
import { Point } from 'Geometry/Point/Point';

export interface Pointer {
	name: string;
	path: Path | Paths;
	start: Point;
	end: Point;
	middle: readonly Point[];
}

export function getPointer(style: string): Pointer {
	const path = (Pointers as unknown as Record<string, Pointer>)[style];
	if (!path) {
		return Pointers.None as unknown as Pointer;
	}
	return path as unknown as Pointer;
}

const Pointers = {
	None: {
		name: 'None',
		path: new Path([new Line(new Point(99, 50), new Point(128, 50))]),
		start: new Point(99, 50),
		end: new Point(128, 50),
		middle: [],
	},
	Angle: {
		name: 'Angle',
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
			],
			false
		),
		start: new Point(94, 50),
		end: new Point(95, 50),
		middle: [],
	},
	ArrowBroad: {
		name: 'ArrowBroad',
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
				new CubicBezier(
					new Point(65, 65),
					new Point(71.398861, 55.223454),
					new Point(65, 35),
					new Point(71.930095, 45.242005)
				),
			],
			true
		),
		start: new Point(70, 50),
		end: new Point(95, 50),
		middle: [],
	},
	ArrowThin: {
		name: 'ArrowThin',
		path: new Path(
			[
				new Line(new Point(65, 40), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 60)),
				new CubicBezier(
					new Point(65, 60),
					new Point(71.701267, 49.930094),
					new Point(65, 40),
					new Point(72.023349, 49.516969)
				),
			],
			true
		),
		start: new Point(70, 50),
		end: new Point(95, 50),
		middle: [],
	},
	CircleFilled: {
		name: 'CircleFilled',
		path: new Path(
			[
				new CubicBezier(
					new Point(64.5, 50.5),
					new Point(64.5, 70.5),
					new Point(94.5, 50.5),
					new Point(94.5, 70.5)
				),
				new CubicBezier(
					new Point(94.5, 50.5),
					new Point(94.5, 30.5),
					new Point(64.5, 50.5),
					new Point(64.5, 30.5)
				),
			],
			true
		),
		start: new Point(64.5, 50.5),
		end: new Point(95, 50),
		middle: [],
	},
	DiamondEmpty: {
		name: 'DiamondEmpty',
		path: new Path(
			[
				new Line(new Point(65, 50), new Point(80, 35)),
				new Line(new Point(80, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(80, 65)),
				new Line(new Point(80, 65), new Point(65, 50)),
			],
			false
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
		middle: [],
	},
	DiamondFilled: {
		name: 'DiamondFilled',
		path: new Path(
			[
				new Line(new Point(65, 50), new Point(80, 35)),
				new Line(new Point(80, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(80, 65)),
				new Line(new Point(80, 65), new Point(65, 50)),
			],
			true
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
		middle: [],
	},
	Many: {
		name: 'Many',
		path: new Paths([
			new Path([new Line(new Point(65, 50), new Point(95, 50))], false),
			new Path(
				[
					new Line(new Point(95, 35), new Point(65, 50)),
					new Line(new Point(65, 50), new Point(95, 65)),
				],
				false
			),
		]),
		start: new Point(65, 50),
		end: new Point(95, 50),
		middle: [],
	},
	ManyMandatory: {
		name: 'ManyManadatory',
		path: new Paths([
			new Path([new Line(new Point(62.8, 50), new Point(95, 50))], false),
			new Path(
				[
					new Line(new Point(95, 35), new Point(65, 50)),
					new Line(new Point(65, 50), new Point(95, 65)),
				],
				false
			),
			new Path([new Line(new Point(63, 35), new Point(63, 65))], false),
		]),
		start: new Point(62.72, 50),
		end: new Point(95, 50),
		middle: [],
	},
	ManyOptional: {
		name: 'ManyOptional',
		path: new Paths([
			new Path([new Line(new Point(65, 50), new Point(95, 50))], false),
			new Path(
				[
					new Line(new Point(95, 35), new Point(65, 50)),
					new Line(new Point(65, 50), new Point(95, 65)),
				],
				false
			),
			new Path(
				[
					new CubicBezier(
						new Point(34.5, 49.5),
						new Point(34.5, 69.5),
						new Point(64.5, 49.5),
						new Point(64.5, 69.5)
					),
					new CubicBezier(
						new Point(64.5, 49.5),
						new Point(64.5, 29.5),
						new Point(34.5, 49.5),
						new Point(34.5, 29.5)
					),
				],
				false
			),
		]),
		start: new Point(34.5, 49.5),
		end: new Point(95, 50),
		middle: [],
	},
	One: {
		name: 'One',
		path: new Paths([
			new Path([new Line(new Point(79.5, 35), new Point(79.5, 65))], false),
			new Path([new Line(new Point(95, 49.5), new Point(79.18, 49.5))], false),
		]),
		start: new Point(79.1, 49.5),
		end: new Point(95, 50),
		middle: [],
	},
	OneMandatory: {
		name: 'OneMandatory',
		path: new Paths([
			new Path([new Line(new Point(79.5, 35), new Point(79.5, 65))], false),
			new Path([new Line(new Point(95, 49.5), new Point(79.18, 49.5))], false),

			new Path([new Line(new Point(64.5, 35), new Point(64.5, 65))], false),
		]),
		start: new Point(64.5, 49.5),
		end: new Point(95, 50),
		middle: [],
	},
	OneOptional: {
		name: 'OneOptional',
		path: new Paths([
			new Path([new Line(new Point(79.5, 35), new Point(79.5, 65))], false),
			new Path([new Line(new Point(95, 50), new Point(65, 50))], false),
			new Path(
				[
					new CubicBezier(
						new Point(34.5, 49.5),
						new Point(34.5, 69.5),
						new Point(64.5, 49.5),
						new Point(64.5, 69.5)
					),
					new CubicBezier(
						new Point(64.5, 49.5),
						new Point(64.5, 29.5),
						new Point(34.5, 49.5),
						new Point(34.5, 29.5)
					),
				],
				false
			),
		]),
		start: new Point(34.5, 49.5),
		end: new Point(95, 50),
		middle: [],
	},
	TriangleEmpty: {
		name: 'TriangleEmpty',
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
				new Line(new Point(65, 65), new Point(65, 35)),
			],
			false
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
		middle: [],
	},
	TriangleFilled: {
		name: 'TriangleFilled',
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
				new Line(new Point(65, 65), new Point(65, 35)),
			],
			true
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
		middle: [],
	},
	Zero: {
		name: 'Zero',
		path: new Path(
			[
				new CubicBezier(
					new Point(64.5, 50.5),
					new Point(64.5, 70.5),
					new Point(94.5, 50.5),
					new Point(94.5, 70.5)
				),
				new CubicBezier(
					new Point(94.5, 50.5),
					new Point(94.5, 30.5),
					new Point(64.5, 50.5),
					new Point(64.5, 30.5)
				),
			],
			false
		),
		start: new Point(64.5, 49.5),
		end: new Point(95, 50),
		middle: [],
	},
} as const;

export type ConnectorPointerStyle = keyof typeof Pointers;
