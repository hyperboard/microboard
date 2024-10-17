import { Command } from "../../Events";
import { LinkTo } from "./LinkTo";
import { LinkToOperation } from "./LinkToOperation";
import { mapItemsByOperation } from "../ItemsCommandUtils";

export class LinkToCommand implements Command {
	reverse = this.getReverse();

	constructor(private linkTo: LinkTo[], private operation: LinkToOperation) {}

	apply(): void {
		for (const linkTo of this.linkTo) {
			linkTo.apply(this.operation);
		}
	}

	revert(): void {
		this.reverse.forEach(({ item, operation }) => {
			item.apply(operation);
		});
	}

	getReverse(): {
		item: LinkTo;
		operation: LinkToOperation;
	}[] {
		const op = this.operation;
		switch (this.operation.method) {
			case "setLinkTo":
			case "removeLinkTo":
				return mapItemsByOperation(this.linkTo, linkTo => {
					return {
						...this.operation,
						link: linkTo.link,
					};
				});
		}
	}
}
