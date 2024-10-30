/* eslint-disable @typescript-eslint/naming-convention */
import { RichTextOperation } from "Board/Items";
import { Operation } from "./EventsOperations";
import {
	InsertTextOperation,
	NodeOperation,
	Path,
	RemoveTextOperation,
	Operation as SlateOp,
	SplitNodeOperation,
	TextOperation,
} from "slate";
import { RemoveNodeOperation } from "slate";
import { BoardOps, CreateItem, RemoveItem } from "Board/BoardOperations";

// InsertTextOperation | RemoveTextOperation | MergeNodeOperation | MoveNodeOperation | RemoveNodeOperation | SetNodeOperation | SplitNodeOperation

// Arsenii - any_InsertTextOperation
// Sawa - any_SetNodeOperation

const operationTransformMap: Record<string, Record<string, Function>> = {
	insert_text: {
		insert_text: insertText_insertText,
		remove_text: insertText_removeText,
		split_node: insertText_splitNode,
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
	},
	remove_text: {
		insert_text: removeText_insertText,
		remove_text: () => {},
		split_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
	},
	split_node: {
		insert_text: splitNode_insertText,
		remove_text: () => {},
		split_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
	},
	merge_node: {
		insert_text: () => {},
		remove_text: () => {},
		split_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
	},
	move_node: {
		insert_text: () => {},
		remove_text: () => {},
		split_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
	},
	remove_node: {
		insert_text: removeNode_insertText,
		remove_text: () => {},
		split_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
	},
	set_node: {
		insert_text: () => {},
		remove_text: () => {},
		split_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
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
	if (
		Path.equals(confirmed.path, toTransform.path) &&
		"position" in confirmed
	) {
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
	if (Path.isBefore(confirmed.path, toTransform.path)) {
		// transformed.path = Path.decrement(toTransform.path);
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
	toTranform: RichTextOperation,
): RichTextOperation | undefined {
	if (!("item" in confirmed) || !("item" in toTranform)) {
		return undefined;
	}

	if (toTranform.item[0] !== confirmed.item[0]) {
		return undefined;
	}

	if (confirmed.method === "edit" && toTranform.method === "edit") {
		const transformedOps: (TextOperation | NodeOperation)[] = [];

		for (const confOp of confirmed.ops) {
			for (const transfOp of toTranform.ops) {
				const transformFunction =
					operationTransformMap[confOp.type]?.[transfOp.type];
				if (transformFunction) {
					transformedOps.push(transformFunction(confOp, transfOp));
				}

				// others Transforms
			}
		}

		return {
			...toTranform,
			ops: transformedOps,
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
