import { DefaultTransformationData } from "../Transformation/TransformationData";

export class TemplateData {
	readonly itemType = "Template";
	constructor(public transformation = new DefaultTransformationData()) {}
}
