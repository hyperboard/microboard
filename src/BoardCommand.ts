import { Command } from "./Events";
import { BoardOperation } from "./BoardOperations";
import { Board } from "Board";
import { Item } from "./Items";

export class BoardCommand implements Command {
	private reverse = this.getReverse();

	constructor(private board: Board, private operation: BoardOperation) {}

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

	getReverse(): BoardOperation | BoardOperation[] {
		const operation = this.operation;

		switch (operation.method) {
			case "bringToFront": {
				const items = operation.item
					.map(item => this.board.items.getById(item))
					.filter((item): item is Item => item !== undefined);
				return {
					class: "Board",
					method: "sendToBack",
					item: items.map(item => item.getId()),
				};
			}
			case "sendToBack": {
				const items = operation.item
					.map(item => this.board.items.getById(item))
					.filter((item): item is Item => item !== undefined);
				return {
					class: "Board",
					method: "bringToFront",
					item: items.map(item => item.getId()),
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
			case "remove": {
				const items = this.board.items;
				const reverse: BoardOperation[] = [];

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
					item: [operation.item],
				};
			}
			case "paste": {
				const item = [];
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
}
