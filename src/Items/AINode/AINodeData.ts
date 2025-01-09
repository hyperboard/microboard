import { TransformationData } from "Board/Items/Transformation/TransformationData";
import { RichTextData } from "Board/Items/RichText/RichTextData";
import { Point } from "Board/Items/Point/Point";

export interface AINodeData {
	readonly itemType: "AINode";
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
	parentNodeId?: string;
	isUserRequest: boolean;
	adjustmentPoint: Point | null;
}
