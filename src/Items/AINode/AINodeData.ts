import { Mbr } from "Board/Items/Mbr/Mbr";
import { Path } from "Board/Items/Path/Path";
import { Line } from "Board/Items/Line/Line";
import { Point } from "Board/Items/Point/Point";
import { TransformationData } from "Board/Items/Transformation/TransformationData";
import { RichTextData } from "Board/Items/RichText/RichTextData";

export const AINodeShape = {
	name: "AINodeShape",
	textBounds: new Mbr(),
	path: new Path(
		[
			new Line(new Point(0, 0), new Point(100, 0)),
			new Line(new Point(100, 0), new Point(100, 100)),
			new Line(new Point(100, 100), new Point(0, 100)),
			new Line(new Point(0, 100), new Point(0, 0)),
		],
		true,
		"rgb(255, 255, 255)",
		"black",
		"solid",
		2,
	),
	anchorPoints: [
		new Point(0, 50),
		new Point(100, 50),
		new Point(50, 0),
		new Point(50, 100),
	],
};

export interface AINodeData {
	readonly itemType: "AINode";
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
	parentNodeId?: string;
	isUserRequest: boolean;
}
