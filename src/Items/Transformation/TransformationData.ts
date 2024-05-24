import { validator } from "Board/Validators";
import { JSONSchemaType } from "ajv";

export interface TransformationData {
	translateX: number;
	translateY: number;
	scaleX: number;
	scaleY: number;
	rotate: number;
}

const transformationDataSchema: JSONSchemaType<TransformationData> = {
	type: "object",
	properties: {
		translateX: { type: "number" },
		translateY: { type: "number" },
		scaleX: { type: "number" },
		scaleY: { type: "number" },
		rotate: { type: "number" },
	},
	required: ["translateX", "translateY", "scaleX", "scaleY", "rotate"],
	additionalProperties: false,
};

validator.addSchema(transformationDataSchema, "transformationDataSchema");

export class DefaultTransformationData implements TransformationData {
	constructor(
		public translateX = 0,
		public translateY = 0,
		public scaleX = 1,
		public scaleY = 1,
		public rotate = 0,
	) {}
}
