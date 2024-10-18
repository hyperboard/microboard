import { Command } from "Board/Events";
import { Drawing } from "./Drawing";
import { DrawingOperation } from "./DrawingOperation";

export class DrawingCommand implements Command {
	private item: Drawing[];
	private operation: DrawingOperation;
	private reverse: { item: Drawing; operation: DrawingOperation }[];

	constructor(item: Drawing[], operation: DrawingOperation) {
		this.item = item;
		this.operation = operation;
		this.reverse = this.getReverse();
	}

	apply(): void {
		for (const item of this.item) {
			item.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: Drawing; operation: DrawingOperation }[] {
		const reverse: { item: Drawing; operation: DrawingOperation }[] = [];
		for (const item of this.item) {
			reverse.push({ item, operation: this.getReverseOperation(item) });
		}
		return reverse;
	}

	getReverseOperation(item: Drawing): DrawingOperation {
		switch (this.operation.method) {
			case "setStrokeColor":
				return {
					class: "Drawing",
					method: "setStrokeColor",
					item: [item.getId()],
					color: item.getStrokeColor(),
				};
			case "setStrokeWidth":
				return {
					class: "Drawing",
					method: "setStrokeWidth",
					item: [item.getId()],
					width: this.operation.prevWidth,
					prevWidth: item.getStrokeWidth(),
				};
			case "setStrokeOpacity":
				return {
					class: "Drawing",
					method: "setStrokeOpacity",
					item: [item.getId()],
					opacity: item.getStrokeOpacity(),
				};
			case "setStrokeStyle":
				return {
					class: "Drawing",
					method: "setStrokeStyle",
					item: [item.getId()],
					style: item.getBorderStyle(),
				};
		}
	}
}
