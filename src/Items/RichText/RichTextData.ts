import { Descendant } from "slate";
import { VerticalAlignment } from "../Alignment";
import { TransformationData } from "../Transformation/TransformationData";
import { validator } from "Board/Validators";
import { JSONSchemaType } from "ajv";

export interface RichTextData {
	readonly itemType: "RichText";
	children: Descendant[];
	verticalAlignment: VerticalAlignment;
	maxWidth?: number;
	transformation?: TransformationData;
	containerMaxWidth?: number;
	insideOf?: string;
	color?: string;
	placeholderText: string;
}

const richTextDataSchema: JSONSchemaType<RichTextData> = {
	type: "object",
	properties: {
		itemType: { type: "string", const: "RichText" },
		children: { type: "array", items: { type: "object" } },
		verticalAlignment: { type: "string" },
		maxWidth: { type: "number", nullable: true },
		transformation: {
			$ref: "transformationDataSchema",
			nullable: true,
		},
		containerMaxWidth: { type: "number", nullable: true },
	},
	required: ["itemType", "children", "verticalAlignment", "maxWidth"],
	additionalProperties: false,
};

validator.addSchema(richTextDataSchema, "richTextDataSchema");

export class DefaultRichTextData implements RichTextData {
	readonly itemType = "RichText";
	constructor(
		public children: Descendant[] = [],
		public verticalAlignment: VerticalAlignment = "center",
		public maxWidth?: number,
		public transformation?: TransformationData,
		public containerMaxWidth?: number,
		public insideOf?: string,
		public color?: string,
		public placeholderText = "",
	) {}
}
