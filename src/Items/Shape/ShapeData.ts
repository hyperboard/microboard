import { JSONSchemaType } from "ajv";
import { validator } from "Board/Validators";
import { DEFAULT_STROKE_COLOR } from "View/Tools/AddShape";
import { BorderStyle, BorderWidth } from "../Path";
import { RichTextData } from "../RichText";
import { DefaultRichTextData } from "../RichText/RichTextData";
import {
	TransformationData,
	DefaultTransformationData,
} from "../Transformation";
import { ShapeType } from "./Basic";
import { RequiredMembers } from "ajv/dist/types/json-schema";

export interface ShapeData {
	readonly itemType: "Shape";
	shapeType: ShapeType;
	backgroundColor: string;
	backgroundOpacity: number;
	borderColor: string;
	borderOpacity: number;
	borderStyle: BorderStyle;
	borderWidth: BorderWidth;
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
}

const shapeDataSchema: JSONSchemaType<ShapeData> = {
	type: "object",
	properties: {
		itemType: { type: "string", const: "Shape" },
		shapeType: { type: "string" },
		backgroundColor: { type: "string" },
		backgroundOpacity: { type: "number" },
		borderColor: { type: "string" },
		borderOpacity: { type: "number" },
		borderStyle: { type: "string" },
		borderWidth: { type: "number" },
		linkTo: { type: "string", nullable: true },
		transformation: {
			$ref: "transformationDataSchema",
		},
		text: {
			$ref: "richTextDataSchema",
		},
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
		"transformation",
		"text",
	] as RequiredMembers<ShapeData>[],
	additionalProperties: false,
} as const;

validator.addSchema(shapeDataSchema, "shapeDataSchema");

export class DefaultShapeData implements ShapeData {
	readonly itemType = "Shape";
	constructor(
		public shapeType: ShapeType = "Rectangle",
		public backgroundColor = "none",
		public backgroundOpacity = 1,
		public borderColor = DEFAULT_STROKE_COLOR,
		public borderOpacity = 1,
		public borderStyle: BorderStyle = "solid",
		public borderWidth: BorderWidth = 1,
		public transformation = new DefaultTransformationData(),
		public text = new DefaultRichTextData(),
		public linkTo?: string,
	) {}
}
