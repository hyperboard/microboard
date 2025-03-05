import { Board } from "Board";
import { DEFAULT_TEXT_STYLES, RichText } from "./RichText";
import { GroupEdit, RichTextOperation } from "./RichTextOperations";
import { Command } from "Board/Events";
import { Operation } from "slate";

export class RichTextCommand implements Command {
	private reverse: { item: string; operation: RichTextOperation }[];

	constructor(
		private board: Board,
		private richText: string[],
		private operation: RichTextOperation,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		for (const id of this.richText) {
			const richText = this.board.items.getById(id);
			if (!richText) {
				continue;
			}
			richText.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			const richText = this.board.items.getById(item);
			if (!richText) {
				continue;
			}
			richText.apply(operation);
		}
	}

	getReverse(): { item: string; operation: RichTextOperation }[] {
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
			case "setFontColor":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						fontColor:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getFontColor() ||
							DEFAULT_TEXT_STYLES.fontColor,
					},
				}));

			case "setBlockType":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						type:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getBlockType() || "paragraph",
					},
				}));

			case "setFontStyle":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						fontStyleList:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getFontStyles() || [],
					},
				}));

			case "setFontFamily":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						fontFamily:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getFontFamily() ||
							DEFAULT_TEXT_STYLES.fontFamily,
					},
				}));

			case "setFontSize":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						fontSize:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getFontSize() || DEFAULT_TEXT_STYLES.fontSize,
					},
				}));

			case "setFontHighlight":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						fontHighlight:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getFontHighlight() ||
							DEFAULT_TEXT_STYLES.fontHighlight,
					},
				}));

			case "setHorisontalAlignment":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						horisontalAlignment:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getHorisontalAlignment() ?? "left",
					},
				}));

			case "setVerticalAlignment":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						verticalAlignment:
							this.board.items
								.getById(id)
								?.getRichText()
								?.getVerticalAlignment() || "top",
					},
				}));

			case "setMaxWidth":
				return items.map(id => ({
					item: id,
					operation: {
						...this.operation,
						maxWidth: this.board.items
							.getById(id)
							?.getRichText()
							?.getMaxWidth(),
					},
				}));

			default:
				return items.map(id => ({
					item: id,
					operation: { ...this.operation },
				}));
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
