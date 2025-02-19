import {
	DefaultTransformationData,
	TransformationData,
} from "../Transformation/TransformationData";
import { validator } from "Board/Validators";
import { FRAME_FILL_COLOR, FRAME_BORDER_COLOR } from "View/Items/Frame";
import { JSONSchemaType } from "ajv";
import { RichTextData } from "../RichText";
import { BorderStyle, BorderWidth } from "../Path";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { FrameType } from "./Basic";

export interface FrameData {
	readonly itemType: "Frame";
	shapeType: FrameType;
	backgroundColor: string;
	backgroundOpacity: number;
	borderColor: string;
	borderOpacity: number;
	borderStyle: BorderStyle;
	borderWidth: BorderWidth;
	children: string[];
	transformation?: TransformationData;
	text?: RichTextData;
	canChangeRatio?: boolean;
	linkTo?: string;
}

const frameDataSchema: JSONSchemaType<FrameData> = {
	type: "object",
	properties: {
		itemType: { type: "string", const: "Frame" },
		shapeType: { type: "string" },
		backgroundColor: { type: "string" },
		backgroundOpacity: { type: "number" },
		borderColor: { type: "string" },
		borderOpacity: { type: "number" },
		borderStyle: { type: "string" },
		borderWidth: { type: "number" },
		transformation: { $ref: "transformationDataSchema", nullable: true },
		children: {
			type: "array",
			items: { type: "string" },
		},
		text: { $ref: "richTextDataSchema", nullable: true },
		canChangeRatio: { type: "boolean", nullable: true },
		linkTo: { type: "string", nullable: true },
	},
	required: [
		"itemType",
		"shapeType",
		"backgroundColor",
		"backgroundOpacity",
		"borderColor",
		"borderOpacity",
		"borderStyle",
		"borderWidth",
		"children",
	],
	additionalProperties: false,
};

validator.addSchema(frameDataSchema, "frameDataSchema");

export class DefaultFrameData implements FrameData {
	readonly itemType = "Frame";
	constructor(
		public shapeType: FrameType = "Custom",
		public backgroundColor = FRAME_FILL_COLOR,
		public backgroundOpacity = 1,
		public borderColor = FRAME_BORDER_COLOR,
		public borderOpacity = 0.08,
		public borderStyle: BorderStyle = "solid",
		public borderWidth: BorderWidth = 0.2,
		public transformation = new DefaultTransformationData(),
		public children: string[] = [],
		public text: RichTextData = new DefaultRichTextData([], "top", 600),
		public canChangeRatio = true,
		public linkTo?: string,
	) {}
}
