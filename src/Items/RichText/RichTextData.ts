import { Descendant } from "slate";
import { VerticalAlignment } from "../Alignment";
import { TransformationData } from "../Transformation/TransformationData";
import { validator } from "Board/Validators";
import { JSONSchemaType } from "ajv";
import { ItemType } from "../Item";

export interface RichTextData {
	readonly itemType: "RichText";
	children: Descendant[];
	verticalAlignment: VerticalAlignment;
	maxWidth?: number;
	transformation?: TransformationData;
	containerMaxWidth?: number;
	insideOf?: ItemType;
	color?: string;
	placeholderText: string;
	realSize: "auto" | number;
	linkTo?: string;
}

const richTextDataSchema: JSONSchemaType<RichTextData> = {
	type: "object",
	properties: {
		itemType: { type: "string", const: "RichText" },
		children: {
			type: "array",
			items: {
				type: "object",
				required: [],
				additionalProperties: true,
			},
		},
		verticalAlignment: { type: "string" },
		maxWidth: { type: "number", nullable: true },
		linkTo: { type: "string", nullable: true },
		insideOf: { type: "string", nullable: true },
		placeholderText: { type: "string" },
		color: { type: "string", nullable: true },
		realSize: { type: ["string", "number"] },
		transformation: {
			$ref: "transformationDataSchema",
			nullable: true,
		},
		containerMaxWidth: { type: "number", nullable: true },
	},
	required: [
		"itemType",
		"children",
		"verticalAlignment",
		"placeholderText",
		"realSize",
	],
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
		public linkTo?: string,
		public containerMaxWidth?: number,
		public insideOf?: ItemType,
		public color?: string,
		public placeholderText = "",
		public realSize: "auto" | number = 14,
	) {}
}
