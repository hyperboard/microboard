import { Command } from "./Events";
import { BoardOps } from "./BoardOperations";
import { Board } from "Board";
import { Group } from "./Items/Group";

export class BoardCommand implements Command {
	private reverse: BoardOps | BoardOps[];

	constructor(
		private board: Board,
		private operation: BoardOps,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		this.board.apply(this.operation);
	}

	revert(): void {
		if (Array.isArray(this.reverse)) {
			this.reverse.forEach(op => {
				this.board.apply(op);
			});
		} else {
			this.board.apply(this.reverse);
		}
	}

	getReverse(): BoardOps | BoardOps[] {
		const operation = this.operation;
		switch (operation.method) {
			case "bringToFront": {
				for (const id in operation.prevZIndex) {
					const item = this.board.items.getById(id);
					if (!item) {
						delete operation.prevZIndex.id;
					}
				}
				return {
					class: "Board",
					method: "moveManyToZIndex",
					item: operation.prevZIndex,
				};
			}
			case "sendToBack": {
				for (const id in operation.prevZIndex) {
					const item = this.board.items.getById(id);
					if (!item) {
						delete operation.prevZIndex.id;
					}
				}
				return {
					class: "Board",
					method: "moveManyToZIndex",
					item: operation.prevZIndex,
				};
			}
			case "moveSecondAfterFirst":
			case "moveSecondBeforeFirst":
			case "moveToZIndex": {
				const items = this.board.items;
				const item = items.getById(operation.item);
				if (!item) {
					throw new Error(
						"Get reverse board operation. Item not found",
					);
				}
				const zIndex = this.board.getZIndex(item);
				return {
					class: "Board",
					method: "moveToZIndex",
					item: operation.item,
					zIndex,
				};
			}
			case "moveManyToZIndex": {
				for (const id in operation.item) {
					const item = this.board.items.getById(id);
					if (!item) {
						delete operation.item.id;
					}
				}
				if (!operation.item) {
					throw new Error(
						"Get reverse board operation. Item not found",
					);
				}
				return {
					class: "Board",
					method: "moveManyToZIndex",
					item: operation.item,
				};
			}
			case "remove": {
				const items = this.board.items;
				const reverse: BoardOps[] = [];

				for (const itemId of operation.item) {
					const item = items.getById(itemId);
					if (!item) {
						throw new Error(
							"Get reverse board operation. Item not found",
						);
					}
					reverse.push({
						class: "Board",
						method: "add",
						item: itemId,
						data: item.serialize(),
					});
				}

				return reverse;
			}
			case "add": {
				return {
					class: "Board",
					method: "remove",
					item: Array.isArray(operation.item)
						? operation.item
						: [operation.item],
				};
			}
			case "addLockedGroup": {
				return {
					class: "Board",
					method: "removeLockedGroup",
					item: [operation.item],
				};
			}
			case "removeLockedGroup": {
				const items = this.board.items;
				const reverse: BoardOps[] = [];

				for (const itemId of operation.item) {
					const item = items.getById(itemId);
					if (!item || item.itemType !== "Group") {
						throw new Error(
							"Get reverse board operation. Item not found",
						);
					}
					reverse.push({
						class: "Board",
						method: "addLockedGroup",
						item: itemId,
						data: item.serialize(),
					});
				}

				return reverse;
			}
			case "duplicate":
			case "paste": {
				const item: string[] = [];
				const map = operation.itemsMap;
				// iterate over map and add items to array
				for (const key in map) {
					if (map.hasOwnProperty(key)) {
						item.push(key);
					}
				}
				return {
					class: "Board",
					method: "remove",
					item: item,
				};
			}
		}
	}

	merge(op: BoardOps): this {
		this.operation = op;
		return this;
	}
}
