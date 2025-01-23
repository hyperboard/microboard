import { TransformationData } from "Board/Items/Transformation/TransformationData";
import { RichTextData } from "Board/Items/RichText/RichTextData";
import { Point } from "Board/Items/Point/Point";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Path } from "Board/Items/Path/Path";
import { CubicBezier } from "Board/Items/Curve/Curve";
import { Line } from "Board/Items/Line/Line";

export interface AINodeData {
	readonly itemType: "AINode";
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
	parentNodeId?: string;
	isUserRequest: boolean;
	adjustmentPoint: Point | null;
	contextItems: string[];
}

const convexity = 2;
const nearBreakpoint = 5;
const farBreakpoint = 10;

export const createNodePath = (mbr: Mbr) => {
	let ratio = mbr.getWidth() / mbr.getHeight();

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
					new Point(100, 100 - farBreakpoint),
				),
				new CubicBezier(
					new Point(100, 100 - farBreakpoint),
					new Point(100, 100 - nearBreakpoint - convexity),
					new Point(100 - quotientFarBreakpoint, 100),
					new Point(
						100 - quotientNearBreakpoint + quotientConvexity,
						100,
					),
				),
				new Line(
					new Point(100 - quotientFarBreakpoint, 100),
					new Point(quotientFarBreakpoint, 100),
				),
				new CubicBezier(
					new Point(quotientFarBreakpoint, 100),
					new Point(quotientNearBreakpoint - quotientConvexity, 100),
					new Point(0, 100 - farBreakpoint),
					new Point(0, 100 - nearBreakpoint - convexity),
				),
				new Line(
					new Point(0, 100 - farBreakpoint),
					new Point(0, farBreakpoint),
				),
			],
			true,
			"rgb(255, 255, 255)",
			"rgba(222, 224, 227, 1)",
		);
	}

	ratio = mbr.getHeight() / mbr.getWidth();
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
				new Point(0, 100 - quotientNearBreakpoint - quotientConvexity),
			),
			new Line(
				new Point(0, 100 - quotientFarBreakpoint),
				new Point(0, quotientFarBreakpoint),
			),
		],
		true,
		"rgb(255, 255, 255)",
		"rgba(222, 224, 227, 1)",
	);
};
