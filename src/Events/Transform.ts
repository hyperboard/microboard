/* eslint-disable @typescript-eslint/naming-convention */
import { RichTextOperation } from "Board/Items";
import { Operation } from "./EventsOperations";
import {
	InsertTextOperation,
	MergeNodeOperation,
	NodeOperation,
	Path,
	RemoveTextOperation,
	RemoveNodeOperation,
	Operation as SlateOp,
	SplitNodeOperation,
	TextOperation,
	InsertNodeOperation,
} from "slate";
import { BoardOps, CreateItem, RemoveItem } from "Board/BoardOperations";

// InsertTextOperation | RemoveTextOperation | MergeNodeOperation | MoveNodeOperation | RemoveNodeOperation | SetNodeOperation | SplitNodeOperation | InsertNodeOperation

// finished - any_InsertTextOperation
// finished - any_RemoveTextOperation
// TODO recheck with set_node

// Sawa - any_SetNodeOperation

type SlateOpTypesToTransform = TextOperation['type'] | NodeOperation['type'];
type SlateOpsToTransform = TextOperation | NodeOperation;
type TransformFunction<T extends SlateOpsToTransform, U extends SlateOpsToTransform> = (confirmed: T, toTransform: U) => U;

type OperationTransformMap = {
	[K in SlateOpTypesToTransform]: {
		[L in SlateOpTypesToTransform]: TransformFunction<
			Extract<SlateOpsToTransform, { type: K }>, Extract<SlateOpsToTransform, { type: L }>
		> | (() => void); // TODO remove () => void when finished
	}
};

const operationTransformMap: OperationTransformMap = {
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
		remove_text: removeText_removeText,
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	insert_node: {
		insert_text: insertNode_insertText,
		remove_text: insertNode_removeText,
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	split_node: {
		insert_text: splitNode_insertText,
		remove_text: splitNode_removeText,
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	merge_node: {
		insert_text: mergeNode_insertText,
		remove_text: mergeNode_removeText,
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	move_node: { // DOES NOT APPEAR ? 
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
		remove_text: removeNode_removeText,
		insert_node: () => {},
		merge_node: () => {},
		move_node: () => {},
		remove_node: () => {},
		set_node: () => {},
		split_node: () => {},
	},
	set_node: {
		insert_text: () => {}, // nothing, before setting it is splitted?
		remove_text: () => {}, // nothing
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

function insertNode_insertText(
	confirmed: InsertNodeOperation,
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

function removeText_removeText(
	confirmed: RemoveTextOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.offset) {
			transformed.offset -= confirmed.text.length;
		}
	}
	return transformed;
}

function insertNode_removeText(
	confirmed: InsertNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	const newPath = Path.transform(transformed.path, confirmed);
	if (newPath) {
		transformed.path = newPath;
	}
	return transformed;
}

function splitNode_removeText(
	confirmed: SplitNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
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

function mergeNode_removeText(
	confirmed: MergeNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
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

function removeNode_removeText(
	confirmed: RemoveNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
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

			const transformedOps: SlateOp[] = [];

			for (const transfOp of toTransformItemOp.ops) {
				let actualyTransformed = { ...transfOp };

				for (const confOp of confirmedItemOp.ops) {
					const transformFunction =
						operationTransformMap[confOp.type]?.[actualyTransformed.type];
					const transformed = transformFunction && transformFunction(confOp, actualyTransformed);

					if (transformed) {
						actualyTransformed = transformed;
					}
				}

				transformedOps.push(actualyTransformed);
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
		const transformedOps: SlateOp[] = [];

		for (const transfOp of toTransform.ops) {
			let actualyTransformed = { ...transfOp };

			for (const confOp of confirmed.ops) {
				const transformFunction =
					operationTransformMap[confOp.type]?.[actualyTransformed.type];
				const transformed = transformFunction && transformFunction(confOp, actualyTransformed);

				if (transformed) {
					actualyTransformed = transformed;
				}
			}

			transformedOps.push(actualyTransformed);
		}

		return {
			...toTransform,
			ops: transformedOps,
		};
	}

	// groupEdit - edit
	if (confirmed.method === "groupEdit" && toTransform.method === "edit") {
		const transformedOps: SlateOp[] = [];

		for (const confItemOp of confirmed.itemsOps) {
			if (confItemOp.item === toTransform.item[0]) {
				for (const transfOp of toTransform.ops) {
					let actualyTransformed = { ...transfOp };

					for (const confOp of confItemOp.ops) {
						const transformFunction =
							operationTransformMap[confOp.type]?.[actualyTransformed.type];
						const transformed = transformFunction && transformFunction(confOp, actualyTransformed);

						if (transformed) {
							actualyTransformed = transformed;
						}
					}

					transformedOps.push(actualyTransformed);
				}
			} else {
				transformedOps.push(...toTransform.ops);
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
			const transformedOps: SlateOp[] = [];

			if (confirmed.item[0] === toTransformItemOp.item) {
				for (const transfOp of toTransformItemOp.ops) {
					let actualyTransformed = { ...transfOp };

					for (const confOp of confirmed.ops) {
						const transformFunction =
							operationTransformMap[confOp.type]?.[actualyTransformed.type];
						const transformed = transformFunction && transformFunction(confOp, actualyTransformed);

						if (transformed) {
							actualyTransformed = transformed;
						}
					}

					transformedOps.push(actualyTransformed);
				}
			} else {
				transformedOps.push(...toTransformItemOp.ops);
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
