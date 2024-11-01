import { Command } from "../../Events";
import { mapItemsByOperation } from "../ItemsCommandUtils";
import { Placeholder } from "./Placeholder";
import { PlaceholderOperation } from "./PlaceholderOperation";

export class PlaceholderCommand implements Command {
	private reverse = this.getReverse();

	constructor(
		private placeholder: Placeholder[],
		private operation: PlaceholderOperation,
	) {}

	apply(): void {
		for (const placeholder of this.placeholder) {
			placeholder.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: Placeholder; operation: PlaceholderOperation }[] {
		const placeholder = this.placeholder;

		switch (this.operation.method) {
			case "setBackgroundColor":
				return mapItemsByOperation(placeholder, placeholder => {
					return {
						...this.operation,
						backgroundColor: placeholder.getBackgroundColor(),
					};
				});
			case "setIcon":
				return mapItemsByOperation(placeholder, placeholder => {
					return {
						...this.operation,
						icon: placeholder.getIcon(),
					};
				});
			case "setMiroData":
				return mapItemsByOperation(placeholder, placeholder => {
					return {
						...this.operation,
						miroData: placeholder.getIcon(),
					};
				});
		}
	}
}
