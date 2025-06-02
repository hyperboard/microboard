import { TransformationData } from 'Items/Transformation/TransformationData';
import { RichTextData } from 'Items/RichText/RichTextData';
import { ThreadDirection } from 'Items/AINode/AINode';
import { Mbr } from 'Items/Mbr/Mbr';
import { Path } from 'Items/Path/Path';
import { CubicBezier } from 'Items/Curve/Curve';
import { Point } from 'Items/Point/Point';
import { Line } from 'Items/Line/Line';
import { Matrix } from 'Items/Transformation/Matrix';

export interface AINodeData {
	readonly itemType: 'AINode';
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
	parentNodeId?: string;
	isUserRequest: boolean;
	contextItems: string[];
	threadDirection: ThreadDirection;
}

const convexity = 1;
const nearBreakpoint = 3;
const farBreakpoint = 6;

export const createNodePath = (mbr: Mbr, matrix: Matrix) => {
	const width = mbr.getWidth();
	const height = mbr.getHeight();
	return new Path(
		[
			new CubicBezier(
				new Point(0, farBreakpoint),
				new Point(0, nearBreakpoint - convexity),
				new Point(farBreakpoint, 0),
				new Point(nearBreakpoint - convexity, 0)
			),
			new Line(new Point(farBreakpoint, 0), new Point(width - farBreakpoint, 0)),
			new CubicBezier(
				new Point(width - farBreakpoint, 0),
				new Point(width - nearBreakpoint + convexity, 0),
				new Point(width, farBreakpoint),
				new Point(width, nearBreakpoint - convexity)
			),
			new Line(new Point(width, farBreakpoint), new Point(width, height - farBreakpoint)),
			new CubicBezier(
				new Point(width, height - farBreakpoint),
				new Point(width, height - nearBreakpoint - convexity),
				new Point(width - farBreakpoint, height),
				new Point(width - nearBreakpoint + convexity, height)
			),
			new Line(new Point(width - farBreakpoint, height), new Point(farBreakpoint, height)),
			new CubicBezier(
				new Point(farBreakpoint, height),
				new Point(nearBreakpoint - convexity, height),
				new Point(0, height - farBreakpoint),
				new Point(0, height - nearBreakpoint - convexity)
			),
			new Line(new Point(0, height - farBreakpoint), new Point(0, farBreakpoint)),
		],
		true,
		'rgb(255, 255, 255)',
		'rgba(222, 224, 227, 1)'
	).getTransformed(new Matrix(matrix.translateX, matrix.translateY));
};
