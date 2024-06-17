import { RichText } from "./RichText";
import { RichTextOperation } from "./RichTextOperations";
import { Command } from "Board/Events";
import { Operation } from "slate";

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
		const items = Array.isArray(this.richText)
			? this.richText
			: [this.richText];
		switch (this.operation.method) {
			case "edit":
				const inverseOps = this.operation.ops.map(op =>
					Operation.inverse(op),
				);
				return items.map(item => {
					const operation = {
						...this.operation,
						ops: inverseOps,
					};
					return { item, operation };
				});
			case "setFontColor": {
				return items.map(richText => {
					const operation = {
						...this.operation,
						fontColor: richText.getFontColor() || "",
					};
					return { item: richText, operation };
				});
			}
			default: {
				return items.map(richText => {
					const operation = {
						...this.operation,
					};
					return { item: richText, operation };
				});
			}
		}
	}
}
