import { TransformationData } from "Board/Items/Transformation/TransformationData";
import { RichTextData } from "Board/Items/RichText/RichTextData";
import { ThreadDirection } from "Board/Items/AINode/AINode";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Path } from "Board/Items/Path/Path";
import { CubicBezier } from "Board/Items/Curve/Curve";
import { Point } from "Board/Items/Point/Point";
import { Line } from "Board/Items/Line/Line";
import { Matrix } from "Board/Items/Transformation/Matrix";

export interface AINodeData {
	readonly itemType: "AINode";
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
	parentNodeId?: string;
	isUserRequest: boolean;
	contextItems: string[];
	threadDirection: ThreadDirection;
}

const convexity = 1;
const nearBreakpoint = 4;
const farBreakpoint = 8;

export const createNodePath = (mbr: Mbr, matrix: Matrix) => {
	let ratio = mbr.getWidth() / mbr.getHeight();
	let path: Path;
	if (ratio >= 1) {
		const quotientFarBreakpoint = farBreakpoint / ratio;
		const quotientNearBreakpoint = nearBreakpoint / ratio;
		const quotientConvexity = convexity / ratio;
		path = new Path(
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
	} else {
		ratio = mbr.getHeight() / mbr.getWidth();
		const quotientFarBreakpoint = farBreakpoint / ratio;
		const quotientNearBreakpoint = nearBreakpoint / ratio;
		const quotientConvexity = convexity / ratio;
		path = new Path(
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
			"rgb(255, 255, 255)",
			"rgba(222, 224, 227, 1)",
		);
	}

	return path.getTransformed(
		new Matrix(
			matrix.translateX,
			matrix.translateY,
			mbr.getWidth() / 100,
			mbr.getHeight() / 100,
		),
	);
};
