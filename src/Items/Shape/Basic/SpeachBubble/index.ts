import { Mbr, CubicBezier, Line, Path, Point } from "Board/Items";
import { createRoundedRectanglePath } from "../RoundedRectangle";

export const SpeachBubble = {
	name: "SpeachBubble",
	textBounds: new Mbr(5, 5, 85, 85),
	path: new Path(
		[
			new CubicBezier(
				new Point(0, 10),
				new Point(0, 5), // Adjusted control point
				new Point(10, 0),
				new Point(5, 0), // Adjusted control point
			),
			new Line(new Point(10, 0), new Point(90, 0)),
			new CubicBezier(
				new Point(90, 0),
				new Point(95, 0), // Adjusted control point
				new Point(100, 10),
				new Point(100, 5), // Adjusted control point
			),
			new Line(new Point(100, 10), new Point(100, 80)),
			new CubicBezier(
				new Point(100, 80),
				new Point(100, 85), // Adjusted control point
				new Point(90, 90),
				new Point(95, 90), // Adjusted control point
			),
			new Line(new Point(90, 90), new Point(30, 90)),
			new Line(new Point(30, 90), new Point(20, 100)),
			new Line(new Point(20, 100), new Point(20, 90)),
			new Line(new Point(20, 90), new Point(10, 90)),
			new CubicBezier(
				new Point(10, 90),
				new Point(5, 90), // Adjusted control point
				new Point(0, 80),
				new Point(0, 85), // Adjusted control point
			),
			new Line(new Point(0, 80), new Point(0, 10)),
		],
		true,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
	createPath: (mbr: Mbr) => createSpeachBubblePath(mbr).copy(),
	useMbrUnderPointer: false,
};

const convexity = 2;
const nearBreakpoint = 10;
const farBreakpoint = 20;

export const createSpeachBubblePath = (mbr: Mbr) => {
	const h = mbr.getHeight();
	const w = mbr.getWidth();
	const rectangleHeight = h - h * 0.1;
	let ratio = w / rectangleHeight;

	if (ratio >= 1) {
		const quotientFarBreakpoint = farBreakpoint / ratio;
		const quotientNearBreakpoint = nearBreakpoint / ratio;
		const quotientConvexity = convexity / ratio;
		return new Path(
			[
				new CubicBezier(
					new Point(0, farBreakpoint),
					new Point(0, nearBreakpoint - convexity),
					new Point(quotientFarBreakpoint, 0),
					new Point(quotientNearBreakpoint - quotientConvexity, 0),
				),
				new Line(
					new Point(quotientFarBreakpoint, 0),
					new Point(100 - quotientFarBreakpoint, 0),
				),
				new CubicBezier(
					new Point(100 - quotientFarBreakpoint, 0),
					new Point(
						100 - quotientNearBreakpoint + quotientConvexity,
						0,
					),
					new Point(100, farBreakpoint),
					new Point(100, nearBreakpoint - convexity),
				),
				new Line(
					new Point(100, farBreakpoint),
					new Point(100, 90 - farBreakpoint),
				),
				new CubicBezier(
					new Point(100, 90 - farBreakpoint),
					new Point(100, 90 - nearBreakpoint - convexity),
					new Point(100 - quotientFarBreakpoint, 90),
					new Point(
						100 - quotientNearBreakpoint + quotientConvexity,
						90,
					),
				),
				new Line(
					new Point(100 - quotientFarBreakpoint, 90),
					new Point(30, 90),
				),
				new Line(new Point(30, 90), new Point(20, 100)),
				new Line(new Point(20, 100), new Point(20, 90)),
				new Line(
					new Point(20, 90),
					new Point(quotientFarBreakpoint, 90),
				),
				new CubicBezier(
					new Point(quotientFarBreakpoint, 90),
					new Point(quotientNearBreakpoint - quotientConvexity, 90),
					new Point(0, 90 - farBreakpoint),
					new Point(0, 90 - nearBreakpoint - convexity),
				),
				new Line(
					new Point(0, 90 - farBreakpoint),
					new Point(0, farBreakpoint),
				),
			],
			true,
		);
	}

	ratio = rectangleHeight / w;
	const quotientFarBreakpoint = farBreakpoint / ratio;
	const quotientNearBreakpoint = nearBreakpoint / ratio;
	const quotientConvexity = convexity / ratio;
	return new Path(
		[
			new CubicBezier(
				new Point(0, quotientFarBreakpoint),
				new Point(0, quotientNearBreakpoint - quotientConvexity),
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
				new Point(100, quotientNearBreakpoint - quotientConvexity),
			),
			new Line(
				new Point(100, quotientFarBreakpoint),
				new Point(100, 90 - quotientFarBreakpoint),
			),
			new CubicBezier(
				new Point(100, 90 - quotientFarBreakpoint),
				new Point(100, 90 - quotientNearBreakpoint - quotientConvexity),
				new Point(100 - farBreakpoint, 90),
				new Point(100 - nearBreakpoint + convexity, 90),
			),
			new Line(new Point(100 - farBreakpoint, 90), new Point(30, 90)),
			new Line(new Point(30, 90), new Point(20, 100)),
			new Line(new Point(20, 100), new Point(20, 90)),
			new Line(new Point(20, 90), new Point(farBreakpoint, 90)),
			new CubicBezier(
				new Point(farBreakpoint, 90),
				new Point(nearBreakpoint - convexity, 90),
				new Point(0, 90 - quotientFarBreakpoint),
				new Point(0, 90 - quotientNearBreakpoint - quotientConvexity),
			),
			new Line(
				new Point(0, 90 - quotientFarBreakpoint),
				new Point(0, quotientFarBreakpoint),
			),
		],
		true,
	);
};
