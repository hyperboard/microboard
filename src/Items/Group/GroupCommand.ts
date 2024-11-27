import { Command } from "../../Events";
import { Group } from "./Group";
import { GroupOperation } from "./GroupOperation";

export class GroupCommand implements Command {
	private reverse: { item: Group; operation: GroupOperation }[];

	constructor(
		private group: Group[],
		private operation: GroupOperation,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		for (const group of this.group) {
			group.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: Group; operation: GroupOperation }[] {
		const group = this.group;
		switch (this.operation.method) {
			case "addChild": {
				const groups = Array.isArray(group) ? group : [group];
				return groups.map(group => {
					const operation: GroupOperation = {
						...this.operation,
						method: "removeChild",
						childId: group.getId(),
					};

					return {
						item: group,
						operation,
					};
				});
			}
			case "removeChild": {
				const groups = Array.isArray(group) ? group : [group];
				return groups.map(group => {
					const operation: GroupOperation = {
						...this.operation,
						method: "addChild",
						childId: group.getId(),
					};

					return {
						item: group,
						operation,
					};
				});
			}
		}
	}
}
