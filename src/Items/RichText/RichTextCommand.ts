import { RichText } from "./RichText";
import { RichTextOperation } from "./RichTextOperations";
import { Command } from "Board/Events";
import { Operation } from "slate";
import { mapItemsByOperation } from "../ItemsCommandUtils";

export class RichTextCommand implements Command {
	private reverse = this.getReverse();

	constructor(
		private richText: RichText[],
		private operation: RichTextOperation,
	) {}

	apply(): void {
		for (const richText of this.richText) {
			richText.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: RichText; operation: RichTextOperation }[] {
		switch (this.operation.method) {
			case "edit":
				const inverseOp = Operation.inverse(this.operation.ops[0]);
				return mapItemsByOperation(this.richText, () => {
					return {
						...this.operation,
						ops: [inverseOp],
					};
				});
			case "setFontColor":
				return mapItemsByOperation(this.richText, richText => {
					return {
						...this.operation,
						fontColor: richText.getFontColor() || "",
					};
				});
			default:
				return mapItemsByOperation(this.richText, () => {
					return {
						...this.operation,
					};
				});
		}
	}
}
