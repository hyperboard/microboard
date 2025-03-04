import { TransformationData } from "Board/Items/Transformation/TransformationData";
import { RichTextData } from "Board/Items/RichText/RichTextData";
import { ThreadDirection } from "Board/Items/AINode/AINode";

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
