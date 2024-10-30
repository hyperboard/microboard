/* eslint-disable @typescript-eslint/naming-convention */
import { RichTextOperation } from "Board/Items";
import { Operation } from "./EventsOperations";
import {
	InsertTextOperation,
	MergeNodeOperation,
	NodeOperation,
	Path,
	RemoveTextOperation,
	Operation as SlateOp,
	SplitNodeOperation,
	TextOperation,
} from "slate";
import { RemoveNodeOperation } from "slate";
import { BoardOps, CreateItem, RemoveItem } from "Board/BoardOperations";
import { ItemOp } from "Board/Items/RichText/RichTextOperations";

// InsertTextOperation | RemoveTextOperation | MergeNodeOperation | MoveNodeOperation | RemoveNodeOperation | SetNodeOperation | SplitNodeOperation | InsertNodeOperation

// Arsenii - any_InsertTextOperation
// Sawa - any_SetNodeOperation

// any_RemoveTextOperation === any_InsertTextOperation ? - одинаковые трансформации для remove и insert ? 

const operationTransformMap: Record<TextOperation['type'] | NodeOperation['type'], Record<TextOperation['type'] | NodeOperation['type'], Function>> = {
	insert_text: {
		insert_text: insertText_insertText,
		remove_text: insertText_removeText,
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: insertText_splitNode,
	},
	remove_text: {
		insert_text: removeText_insertText,
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	insert_node: {
		insert_text: () => {},
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	split_node: {
		insert_text: splitNode_insertText,
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	merge_node: {
		insert_text: mergeNode_insertText,
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	move_node: {
		insert_text: () => {},
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	remove_node: {
		insert_text: removeNode_insertText,
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	set_node: {
		insert_text: () => {},
		remove_text: () => {},
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
};

function insertText_insertText(
	confirmed: InsertTextOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset += confirmed.text.length;
		}
	}
	return transformed;
}

function removeText_insertText(
	confirmed: RemoveTextOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset -= confirmed.text.length;
		}
	}
	return transformed;
}

function splitNode_insertText(
	confirmed: SplitNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.position <= toTransform.offset) {
			transformed.offset -= confirmed.position;
		}
	}
	const newPath = Path.transform(transformed.path, confirmed);
	if (newPath) {
		transformed.path = newPath;
	}
	return transformed;
}

function removeNode_insertText(
	confirmed: RemoveNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	const newPath = Path.transform(transformed.path, confirmed);
	if (newPath) {
		transformed.path = newPath;
	}
	return transformed;
}

function mergeNode_insertText(
	confirmed: MergeNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		transformed.offset += confirmed.position;
	}
	const newPath = Path.transform(transformed.path, confirmed);
	if (newPath) {
		transformed.path = newPath;
	}
	return transformed;
}

function insertText_splitNode(
	confirmed: InsertTextOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position += confirmed.text.length;
		}
	}
	const newPath = Path.transform(transformed.path, confirmed);
	if (newPath) {
		transformed.path = newPath;
	}
	return transformed;
}

function insertText_removeText(
	confirmed: InsertTextOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset += confirmed.text.length;
		}
	}
	return transformed;
}

function transformRichTextOperation(
	confirmed: RichTextOperation,
	toTransform: RichTextOperation,
): RichTextOperation | undefined {
	// groupEdit - groupEdit
	if (confirmed.method === "groupEdit" && toTransform.method === "groupEdit") {
		const transformedItemsOps = toTransform.itemsOps.map(toTransformItemOp => {
			const confirmedItemOp = confirmed.itemsOps.find(
				confItemOp => confItemOp.item === toTransformItemOp.item
			);

			if (!confirmedItemOp) {
				return toTransformItemOp;
			}

			const transformedOps: Operation[] = [];

			for (const confOp of confirmedItemOp.ops) {
				for (const transfOp of toTransformItemOp.ops) {
					const transformFunction =
						operationTransformMap[confOp.type]?.[transfOp.type];
					const transformed = transformFunction && transformFunction(confOp, transfOp);
					if (transformed) {
						transformedOps.push(transformed);
					}
				}
			}

			return {
				...toTransformItemOp,
				ops: transformedOps,
			};
		});

		return {
			...toTransform,
			itemsOps: transformedItemsOps,
		};
	}

	// edit-edit
	if (confirmed.method === "edit" && toTransform.method === "edit" && toTransform.item[0] === confirmed.item[0]) {
		const transformedOps: (TextOperation | NodeOperation)[] = [];

		for (const confOp of confirmed.ops) {
			for (const transfOp of toTransform.ops) {
				const transformFunction =
					operationTransformMap[confOp.type]?.[transfOp.type];
				const transformed = transformFunction && transformFunction(confOp, transfOp);
				if (transformed) {
					transformedOps.push(transformed);
				}
			}
		}

		return {
			...toTransform,
			ops: transformedOps,
		};
	}

	// groupEdit - edit
	if (confirmed.method === "groupEdit" && toTransform.method === "edit") {
		const transformedOps: (TextOperation | NodeOperation)[] = [];

		for (const confItemOp of confirmed.itemsOps) {
			if (confItemOp.item === toTransform.item[0]) {
				for (const confOp of confItemOp.ops) {
					for (const transfOp of toTransform.ops) {
						const transformFunction =
							operationTransformMap[confOp.type]?.[transfOp.type];
						const transformed = transformFunction && transformFunction(confOp, transfOp);
						if (transformed) {
							transformedOps.push(transformed);
						}
					}
				}
			}
		}

		return {
			...toTransform,
			ops: transformedOps,
		};
	}

	// edit - groupEdit
	if (confirmed.method === "edit" && toTransform.method === "groupEdit") {
		const transformedItemsOps = toTransform.itemsOps.map(toTransformItemOp => {
			const transformedOps: Operation[] = [];

			for (const confOp of confirmed.ops) {
				for (const transfOp of toTransformItemOp.ops) {
					if (confirmed.item[0] === toTransformItemOp.item) {
						const transformFunction =
							operationTransformMap[confOp.type]?.[transfOp.type];
						const transformed = transformFunction && transformFunction(confOp, transfOp);
						if (transformed) {
							transformedOps.push(transformed);
						}
					}
				}
			}

			return {
				...toTransformItemOp,
				ops: transformedOps,
			};
		});

		return {
			...toTransform,
			itemsOps: transformedItemsOps,
		};
	}

	return undefined;
}

function transformBoardAddAgainstRemove(
	confirmed: RemoveItem,
	toTransform: CreateItem,
): BoardOps | undefined {
	if (!toTransform?.data) {
		return undefined;
	}

	if (toTransform.data.itemType === "Connector") {
		const connectorData = toTransform.data;
		const removedItems = Array.isArray(confirmed.item)
			? confirmed.item
			: [confirmed.item];

		connectorData.endPoint;
		const startPointRemoved = removedItems.includes(
			connectorData.startPoint?.itemId,
		);
		const endPointRemoved = removedItems.includes(
			connectorData.endPoint?.itemId,
		);

		if (startPointRemoved && endPointRemoved) {
			return undefined;
		}

		if (startPointRemoved || endPointRemoved) {
			const transformedOperation = {
				...toTransform,
				data: {
					...connectorData,
					...(startPointRemoved && {
						startPoint: {
							...connectorData.startPoint,
							pointType: "Floating",
							// itemId: "",
							// relativeX: 0,
							// relativeY: 0,
							originalItemId: connectorData?.startPoint?.itemId,
						},
					}),
					...(endPointRemoved && {
						endPoint: {
							...connectorData.endPoint,
							pointType: "Floating",
							// originalItemId: connectorData?.endPoint?.itemId,
						},
					}),
				},
			};
			return transformedOperation;
		}
	}

	return toTransform;
}

function transformBoardOperation(
	confirmed: Operation,
	toTransform: Operation,
): Operation | undefined {
	if (!("item" in confirmed) || !("item" in toTransform)) {
		return undefined;
	}

	if (confirmed.method === "remove" && toTransform.method === "add") {
		return transformBoardAddAgainstRemove(confirmed, toTransform);
	}

	// Floating. Remove object only on one client
	if (confirmed.method === "remove" && toTransform.method === "remove") {
		const confirmedItems = Array.isArray(confirmed.item)
			? confirmed.item
			: [confirmed.item];
		const toTransformItems = Array.isArray(toTransform.item)
			? toTransform.item
			: [toTransform.item];

		const remainingItems = toTransformItems.filter(
			item => !confirmedItems.includes(item),
		);

		if (remainingItems.length === 0) {
			return undefined;
		}

		return {
			...toTransform,
			item: remainingItems,
		};
	}

	return toTransform;
}

export function transfromOperation(
	confirmed: Operation,
	toTransform: Operation,
): Operation | undefined {
	if (confirmed.class === "RichText" && toTransform.class === "RichText") {
		return transformRichTextOperation(confirmed, toTransform);
	}

	if (confirmed.class === "Board" && toTransform.class === "Board") {
		return transformBoardOperation(confirmed, toTransform);
	}

	// others

	return undefined;
}
