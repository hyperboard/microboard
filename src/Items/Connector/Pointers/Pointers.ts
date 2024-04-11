import { CubicBezier } from "Board/Items/Curve";
import { Line } from "Board/Items/Line";
import { Path, Paths } from "Board/Items/Path";
import { Point } from "Board/Items/Point";

interface Pointer {
	name: string;
	path: Path | Paths;
	start: Point;
	end: Point;
}

export function getPointer(style: string): Pointer {
	const path = Pointers[style];
	if (!path) {
		return Pointers.None;
	}
	return path;
}

const Pointers: Record<string, Pointer> = {
	None: {
		name: "None",
		path: new Path([new Line(new Point(70, 50), new Point(99, 50))]),
		start: new Point(70, 50),
		end: new Point(99, 50),
	},
	Angle: {
		name: "Angle",
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
			],
			false,
		),
		start: new Point(94, 50),
		end: new Point(95, 50),
	},
	ArrowBroad: {
		name: "ArrowBroad",
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
				new CubicBezier(
					new Point(65, 65),
					new Point(71.398861, 55.223454),
					new Point(65, 35),
					new Point(71.930095, 45.242005),
				),
			],
			true,
		),
		start: new Point(70, 50),
		end: new Point(95, 50),
	},
	ArrowThin: {
		name: "ArrowThin",
		path: new Path(
			[
				new Line(new Point(65, 40), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 60)),
				new CubicBezier(
					new Point(65, 60),
					new Point(71.701267, 49.930094),
					new Point(65, 40),
					new Point(72.023349, 49.516969),
				),
			],
			true,
		),
		start: new Point(70, 50),
		end: new Point(95, 50),
	},
	CircleFilled: {
		name: "CircleFilled",
		path: new Path(
			[
				new CubicBezier(
					new Point(64.5, 50.5),
					new Point(64.5, 70.5),
					new Point(94.5, 50.5),
					new Point(94.5, 70.5),
				),
				new CubicBezier(
					new Point(94.5, 50.5),
					new Point(94.5, 30.5),
					new Point(64.5, 50.5),
					new Point(64.5, 30.5),
				),
			],
			true,
		),
		start: new Point(64.5, 50.5),
		end: new Point(95, 50),
	},
	DiamondEmpty: {
		name: "DiamondEmpty",
		path: new Path(
			[
				new Line(new Point(65, 50), new Point(80, 35)),
				new Line(new Point(80, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(80, 65)),
				new Line(new Point(80, 65), new Point(65, 50)),
			],
			false,
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
	},
	DiamondFilled: {
		name: "DiamondFilled",
		path: new Path(
			[
				new Line(new Point(65, 50), new Point(80, 35)),
				new Line(new Point(80, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(80, 65)),
				new Line(new Point(80, 65), new Point(65, 50)),
			],
			false,
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
	},
	Many: {
		name: "Many",
		path: new Paths([
			new Path([new Line(new Point(65, 50), new Point(95, 50))], false),
			new Path(
				[
					new Line(new Point(95, 35), new Point(65, 50)),
					new Line(new Point(65, 50), new Point(95, 65)),
				],
				false,
			),
		]),
		start: new Point(65, 50),
		end: new Point(95, 50),
	},
	ManyMandatory: {
		name: "ManyManadatory",
		path: new Paths([
			new Path([new Line(new Point(62.8, 50), new Point(95, 50))], false),
			new Path(
				[
					new Line(new Point(95, 35), new Point(65, 50)),
					new Line(new Point(65, 50), new Point(95, 65)),
				],
				false,
			),
			new Path([new Line(new Point(63, 35), new Point(63, 65))], false),
		]),
		start: new Point(62.72, 50),
		end: new Point(95, 50),
	},
	ManyOptional: {
		name: "ManyOptional",
		path: new Paths([
			new Path([new Line(new Point(65, 50), new Point(95, 50))], false),
			new Path(
				[
					new Line(new Point(95, 35), new Point(65, 50)),
					new Line(new Point(65, 50), new Point(95, 65)),
				],
				false,
			),
			new Path(
				[
					new CubicBezier(
						new Point(34.5, 49.5),
						new Point(34.5, 69.5),
						new Point(64.5, 49.5),
						new Point(64.5, 69.5),
					),
					new CubicBezier(
						new Point(64.5, 49.5),
						new Point(64.5, 29.5),
						new Point(34.5, 49.5),
						new Point(34.5, 29.5),
					),
				],
				true,
			),
		]),
		start: new Point(34.5, 49.5),
		end: new Point(95, 50),
	},
	One: {
		name: "One",
		path: new Paths([
			new Path(
				[new Line(new Point(79.5, 35), new Point(79.5, 65))],
				false,
			),
			new Path(
				[new Line(new Point(95, 49.5), new Point(79.18, 49.5))],
				false,
			),
		]),
		start: new Point(79.1, 49.5),
		end: new Point(95, 50),
	},
	OneMandatory: {
		name: "OneMandatory",
		path: new Paths([
			new Path(
				[new Line(new Point(79.5, 35), new Point(79.5, 65))],
				false,
			),
			new Path(
				[new Line(new Point(95, 49.5), new Point(79.18, 49.5))],
				false,
			),

			new Path(
				[new Line(new Point(64.5, 35), new Point(64.5, 65))],
				false,
			),
		]),
		start: new Point(64.5, 49.5),
		end: new Point(95, 50),
	},
	OneOptional: {
		name: "OneOptional",
		path: new Paths([
			new Path(
				[new Line(new Point(79.5, 35), new Point(79.5, 65))],
				false,
			),
			new Path([new Line(new Point(95, 50), new Point(65, 50))], false),
			new Path(
				[
					new CubicBezier(
						new Point(34.5, 49.5),
						new Point(34.5, 69.5),
						new Point(64.5, 49.5),
						new Point(64.5, 69.5),
					),
					new CubicBezier(
						new Point(64.5, 49.5),
						new Point(64.5, 29.5),
						new Point(34.5, 49.5),
						new Point(34.5, 29.5),
					),
				],
				true,
			),
		]),
		start: new Point(34.5, 49.5),
		end: new Point(95, 50),
	},
	TriangleEmpty: {
		name: "TriangleEmpty",
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
				new Line(new Point(65, 65), new Point(65, 35)),
			],
			false,
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
	},
	TriangleFilled: {
		name: "TriangleEmpty",
		path: new Path(
			[
				new Line(new Point(65, 35), new Point(95, 50)),
				new Line(new Point(95, 50), new Point(65, 65)),
				new Line(new Point(65, 65), new Point(65, 35)),
			],
			true,
		),
		start: new Point(65, 50),
		end: new Point(95, 50),
	},
	Zero: {
		name: "Zero",
		path: new Path(
			[
				new CubicBezier(
					new Point(64.5, 50.5),
					new Point(64.5, 70.5),
					new Point(94.5, 50.5),
					new Point(94.5, 70.5),
				),
				new CubicBezier(
					new Point(94.5, 50.5),
					new Point(94.5, 30.5),
					new Point(64.5, 50.5),
					new Point(64.5, 30.5),
				),
			],
			false,
		),
		start: new Point(64.5, 49.5),
		end: new Point(95, 50),
	},
};
