import { Command } from "../../Events";
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
				return placeholder.map(placeholder => {
					return {
						item: placeholder,
						operation: {
							...this.operation,
							backgroundColor: placeholder.getBackgroundColor(),
						},
					};
				});
			case "setIcon":
				return placeholder.map(placeholder => {
					return {
						item: placeholder,
						operation: {
							...this.operation,
							icon: placeholder.getIcon(),
						},
					};
				});
			case "setMiroData":
				return placeholder.map(placeholder => {
					return {
						item: placeholder,
						operation: {
							...this.operation,
							miroData: placeholder.getIcon(),
						},
					};
				});
		}
	}
}
