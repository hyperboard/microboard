import { ItemOperation } from "../../Events";

export class TemplateOperation {
	readonly itemType = "Template";
	constructor(public operations: ItemOperation[] = []) {}
}
