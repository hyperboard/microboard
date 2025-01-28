import { RichText } from "./RichText";
import { GroupEdit, RichTextOperation } from "./RichTextOperations";
import { Command } from "Board/Events";
import { Operation } from "slate";

export class RichTextCommand implements Command {
	private reverse: { item: RichText; operation: RichTextOperation }[];

	constructor(
		private richText: RichText[],
		private operation: RichTextOperation,
	) {
		this.reverse = this.getReverse();
	}

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
			case "setSelectionHorizontalAlignment":
			case "setSelectionFontHighlight":
			case "setSelectionFontSize":
			case "setSelectionFontFamily":
			case "setSelectionFontStyle":
			case "setSelectionFontColor":
			case "setSelectionBlockType":
				const inverseOps = this.operation.ops
					.map(op => Operation.inverse(op))
					.reverse();
				// actually there is only one item
				return items.map(item => {
					const operation = {
						...this.operation,
						ops: inverseOps,
					};
					return { item, operation };
				});
			// should replace whole text ops with selection ops
			// and handle them the same way, or the reverse ops would be incorrect
			case "setFontColor": {
				return items.map(richText => {
					const operation = {
						...this.operation,
						fontColor: richText.getFontColor() || "",
					};
					return { item: richText, operation };
				});
			}
			case "setBlockType":
				return items.map(richText => {
					const operation = {
						...this.operation,
						type: richText.getBlockType(),
					};
					return { item: richText, operation };
				});
			case "setFontStyle":
				return items.map(richText => {
					const operation = {
						...this.operation,
						fontStyleList: richText.getFontStyles(),
					};
					return { item: richText, operation };
				});
			case "setFontFamily":
				return items.map(richText => {
					const operation = {
						...this.operation,
						fontFamily: richText.getFontFamily(),
					};
					return { item: richText, operation };
				});
			case "setFontSize":
				return items.map(richText => {
					const operation = {
						...this.operation,
						fontSize: richText.getFontSize(),
					};
					return { item: richText, operation };
				});
			case "setFontHighlight":
				return items.map(richText => {
					const operation = {
						...this.operation,
						fontHighlight: richText.getFontHighlight(),
					};
					return { item: richText, operation };
				});
			case "setHorisontalAlignment":
				return items.map(richText => {
					const operation = {
						...this.operation,
						horisontalAlignment:
							richText.getHorisontalAlignment() ?? "left",
					};
					return { item: richText, operation };
				});
			case "setVerticalAlignment":
				return items.map(richText => {
					const operation = {
						...this.operation,
						verticalAlignment: richText.getVerticalAlignment(),
					};
					return { item: richText, operation };
				});

			case "setMaxWidth":
				return items.map(richText => {
					const operation = {
						...this.operation,
						maxWidth: richText.getMaxWidth(),
					};
					return { item: richText, operation };
				});
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

	merge(op: RichTextOperation): this {
		this.operation = op;
		this.reverse = this.getReverse();
		return this;
	}
}

type TextEdits = {
	item: RichText;
	operation: RichTextOperation;
};

export class RichTextGroupCommand implements Command {
	private forwardOps: TextEdits[];
	private reverseOps: TextEdits[];

	constructor(
		private richText: RichText[],
		private operation: GroupEdit,
	) {
		this.forwardOps = this.getForward();
		this.reverseOps = this.getReverse();
	}

	apply(): void {
		for (const { item, operation } of this.forwardOps) {
			item.apply(operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverseOps) {
			item.apply(operation);
		}
	}

	getForward(): TextEdits[] {
		const forward: TextEdits[] = [];
		for (let i = 0; i < this.richText.length; i++) {
			const richText = this.richText[i];
			const ops = this.operation.itemsOps[i].ops;
			forward.push({
				item: richText,
				operation: {
					class: "RichText",
					method: "edit",
					item: [richText.getId() ?? ""],
					ops,
				},
			});
		}
		return forward;
	}

	getReverse(): TextEdits[] {
		const reverse: TextEdits[] = [];
		for (let i = 0; i < this.richText.length; i++) {
			const richText = this.richText[i];
			const ops = this.operation.itemsOps[i].ops;
			reverse.push({
				item: richText,
				operation: {
					class: "RichText",
					method: "edit",
					item: [richText.getId() ?? ""],
					ops: ops.map(op => Operation.inverse(op)).reverse(),
				},
			});
		}
		return reverse;
	}
}
