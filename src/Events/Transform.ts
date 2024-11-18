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
	SetNodeOperation,
	BaseEditor,
} from "slate";
import { ReactEditor } from "slate-react";
import { HistoryEditor } from "slate-history";

// InsertTextOperation | RemoveTextOperation | MergeNodeOperation | MoveNodeOperation | RemoveNodeOperation | SetNodeOperation | SplitNodeOperation | InsertNodeOperation
// removeNode, insertNode, mergeNode, splitNode -- dependants, most likely to happen together

type SlateOpTypesToTransform = Exclude<
	TextOperation["type"] | NodeOperation["type"],
	"move_node"
>;
type SlateOpsToTransform = Exclude<
	TextOperation | NodeOperation,
	{ type: "move_node" }
>;
type TransformFunction<
	T extends SlateOpsToTransform,
	U extends SlateOpsToTransform,
> = (
	confirmed: T,
	toTransform: U,
	editor: BaseEditor & ReactEditor & HistoryEditor,
) => U | undefined;

type OperationTransformMap = {
	[K in SlateOpTypesToTransform]: {
		[L in SlateOpTypesToTransform]:
			| TransformFunction<
					Extract<SlateOpsToTransform, { type: K }>,
					Extract<SlateOpsToTransform, { type: L }>
			  >
			| (() => void); // TODO remove () => void when finished
	};
};

const operationTransformMap: OperationTransformMap = {
	insert_text: {
		insert_text: insertText_insertText,
		remove_text: insertText_removeText,
		insert_node: insertText_insertNode,
		merge_node: insertText_mergeNode,
		// move_node: () => {},
		remove_node: insertText_removeNode,
		set_node: () => {}, // nothing
		split_node: insertText_splitNode,
	},
	remove_text: {
		insert_text: removeText_insertText,
		remove_text: removeText_removeText,
		insert_node: removeText_insertNode,
		merge_node: removeText_mergeNode,
		// move_node: () => {},
		remove_node: removeText_removeNode,
		set_node: () => {}, // nothing
		split_node: removeText_splitNode,
	},
	insert_node: {
		insert_text: insertNode_insertText,
		remove_text: insertNode_removeText,
		insert_node: insertNode_insertNode,
		merge_node: insertNode_mergeNode,
		// move_node: () => {},
		remove_node: insertNode_removeNode,
		set_node: insertNode_setNode,
		split_node: insertNode_splitNode,
	},
	split_node: {
		insert_text: splitNode_insertText,
		remove_text: splitNode_removeText,
		insert_node: splitNode_insertNode,
		merge_node: splitNode_mergeNode,
		// move_node: () => {},
		remove_node: splitNode_removeNode,
		set_node: splitNode_setNode,
		split_node: splitNode_splitNode,
	},
	merge_node: {
		insert_text: mergeNode_insertText, // todo fix mergeNode_any, splitNode_
		remove_text: mergeNode_removeText,
		insert_node: mergeNode_insertNode,
		merge_node: mergeNode_mergeNode,
		// move_node: () => {},
		remove_node: mergeNode_removeNode,
		set_node: mergeNode_setNode,
		split_node: mergeNode_splitNode,
	},
	// move_node: {
	// 	// DOES NOT APPEAR ?
	// 	insert_text: () => {},
	// 	remove_text: () => {},
	// 	insert_node: () => {},
	// 	merge_node: () => {},
	// 	move_node: () => {},
	// 	remove_node: () => {},
	// 	set_node: () => {},
	// 	split_node: () => {},
	// },
	remove_node: {
		insert_text: removeNode_insertText,
		remove_text: removeNode_removeText,
		insert_node: removeNode_insertNode,
		merge_node: removeNode_mergeNode,
		// move_node: () => {},
		remove_node: removeNode_removeNode,
		set_node: removeNode_setNode,
		split_node: removeNode_splitNode,
	},
	set_node: {
		insert_text: () => {}, // nothing, before setting it is splitted?
		remove_text: () => {}, // nothing
		insert_node: setNode_insertNode,
		merge_node: () => {}, // nothing??
		// move_node: () => {},
		remove_node: setNode_removeNode,
		set_node: setNode_setNode,
		split_node: setNode_splitNode,
	},
};

function transformPath(
	confirmed: SlateOpsToTransform,
	toTransform: SlateOpsToTransform,
): void {
	const newPath = Path.transform(toTransform.path, confirmed);
	if (newPath) {
		toTransform.path = newPath;
	}
}

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
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_insertText(
	confirmed: RemoveNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function insertNode_insertText(
	confirmed: InsertNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

// TODO NEED TO FIX
function mergeNode_insertText(
	confirmed: MergeNodeOperation,
	toTransform: InsertTextOperation,
	// editor: BaseEditor & ReactEditor & HistoryEditor,
): InsertTextOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		// const previousSiblingPath = Path.previous(confirmed.path);
		// const previousNode = Node.get(editor, previousSiblingPath);
		// console.log("PREV NODE", previousNode);
		// TODO NEED TO REWORK, need to add prev node lenght, but also need to upd editor so that node has correct length
		// transformed.offset += Node.string(previousNode).length;
		transformed.offset += confirmed.position;
	}
	transformPath(confirmed, transformed);
	// console.log("ret", transformed);
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
	transformPath(confirmed, transformed);
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
	transformPath(confirmed, transformed);
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
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_removeText(
	confirmed: RemoveNodeOperation,
	toTransform: RemoveTextOperation,
): RemoveTextOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function insertText_insertNode(
	confirmed: InsertTextOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function insertText_removeNode(
	confirmed: InsertTextOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeText_insertNode(
	confirmed: RemoveTextOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeText_removeNode(
	confirmed: RemoveTextOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function insertNode_insertNode(
	confirmed: InsertNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function insertNode_removeNode(
	confirmed: InsertNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_insertNode(
	confirmed: RemoveNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_removeNode(
	confirmed: RemoveNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function splitNode_insertNode(
	confirmed: SplitNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}

function splitNode_removeNode(
	confirmed: SplitNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}

function mergeNode_insertNode(
	confirmed: MergeNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}

function mergeNode_removeNode(
	confirmed: MergeNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}

function setNode_insertNode(
	confirmed: SetNodeOperation,
	toTransform: InsertNodeOperation,
): InsertNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}

function setNode_removeNode(
	confirmed: SetNodeOperation,
	toTransform: RemoveNodeOperation,
): RemoveNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isBefore(confirmed.path, transformed.path)) {
		transformPath(confirmed, transformed);
	}
	return transformed;
}

function insertText_mergeNode(
	confirmed: InsertTextOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	if (
		Path.isBefore(confirmed.path, toTransform.path) &&
		Path.isSibling(confirmed.path, toTransform.path)
	) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position += confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}

function removeText_mergeNode(
	confirmed: RemoveTextOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	if (Path.isSibling(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position += confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}

function insertNode_mergeNode(
	confirmed: InsertNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_mergeNode(
	confirmed: RemoveNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function splitNode_mergeNode(
	confirmed: SplitNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.position <= toTransform.position) {
			transformed.position -= confirmed.position;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}

function mergeNode_mergeNode(
	confirmed: MergeNodeOperation,
	toTransform: MergeNodeOperation,
): MergeNodeOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		transformed.position += confirmed.position;
	}
	transformPath(confirmed, transformed);
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

function removeText_splitNode(
	confirmed: RemoveTextOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		if (confirmed.offset <= toTransform.position) {
			transformed.position -= confirmed.text.length;
		}
	}
	transformPath(confirmed, transformed);
	return transformed;
}

function insertNode_splitNode(
	confirmed: InsertNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_splitNode(
	confirmed: RemoveNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function mergeNode_splitNode(
	confirmed: MergeNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	// todo fix - add length of merged
	// if (Path.equals(confirmed.path, toTransform.path)) {
	// 	transformed.position += confirmed.position;
	// }
	transformPath(confirmed, transformed);
	return transformed;
}

function splitNode_splitNode(
	confirmed: SplitNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	// todo fix
	// if (Path.equals(confirmed.path, toTransform.path)) {
	// 	if (confirmed.position <= toTransform.position) {
	// 		transformed.position -= confirmed.position;
	// 	}
	// }
	transformPath(confirmed, transformed);
	return transformed;
}

function setNode_splitNode(
	confirmed: SetNodeOperation,
	toTransform: SplitNodeOperation,
): SplitNodeOperation {
	const transformed = { ...toTransform };
	transformed.properties = {
		...transformed.properties,
		...confirmed.newProperties,
	};
	transformPath(confirmed, transformed);
	return transformed;
}

function splitNode_setNode(
	confirmed: SplitNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	// todo adjust the path to apply set_node to both resulting nodes
	// or add new set_node to set prev node to prev node
	// if (Path.equals(confirmed.path, toTransform.path)) {
	// }
	transformPath(confirmed, transformed);
	return transformed;
}

function mergeNode_setNode(
	confirmed: MergeNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function insertNode_setNode(
	confirmed: InsertNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function removeNode_setNode(
	confirmed: RemoveNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation | undefined {
	if (Path.equals(confirmed.path, toTransform.path)) {
		return undefined;
	}
	const transformed = { ...toTransform };
	transformPath(confirmed, transformed);
	return transformed;
}

function setNode_setNode(
	confirmed: SetNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		// todo think on it
		transformed.newProperties = {
			...toTransform.newProperties,
			...confirmed.newProperties,
		};
		transformed.properties = {
			...toTransform.properties,
			...confirmed.newProperties,
		};
	}
	return transformed;
}

function transformRichTextOperation(
	confirmed: RichTextOperation,
	toTransform: RichTextOperation,
	// board: Board,
): RichTextOperation | undefined {
	// groupEdit - groupEdit
	if (
		confirmed.method === "groupEdit" &&
		toTransform.method === "groupEdit"
	) {
		const transformedItemsOps = toTransform.itemsOps.map(
			toTransformItemOp => {
				const confirmedItemOp = confirmed.itemsOps.find(
					confItemOp => confItemOp.item === toTransformItemOp.item,
				);
				// const rt = board.items.getById(toTransformItemOp.item)?.getRichText();

				// if (!confirmedItemOp || !rt) {
				if (!confirmedItemOp) {
					return toTransformItemOp;
				}

				// const editor = rt.editor.editor;
				const transformedOps: SlateOp[] = [];

				for (const transfOp of toTransformItemOp.ops) {
					let actualyTransformed = { ...transfOp };

					for (const confOp of confirmedItemOp.ops) {
						const transformFunction =
							operationTransformMap[confOp.type]?.[
								actualyTransformed.type
							];
						const transformed =
							transformFunction &&
							// transformFunction(confOp, actualyTransformed, editor);
							transformFunction(confOp, actualyTransformed);

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
			},
		);

		return {
			...toTransform,
			itemsOps: transformedItemsOps,
		};
	}

	// edit-edit
	if (
		confirmed.method === "edit" &&
		toTransform.method === "edit" &&
		toTransform.item[0] === confirmed.item[0]
	) {
		// const rt = board.items.getById(toTransform.item[0])?.getRichText();
		// if (!rt) {
		// 	return undefined;
		// }
		const transformedOps: SlateOp[] = [];

		for (const transfOp of toTransform.ops) {
			let actualyTransformed = { ...transfOp };

			for (const confOp of confirmed.ops) {
				const transformFunction =
					operationTransformMap[confOp.type]?.[
						actualyTransformed.type
					];
				const transformed =
					transformFunction &&
					// transformFunction(confOp, actualyTransformed, rt.editor.editor);
					transformFunction(confOp, actualyTransformed);

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
			// const rt = board.items.getById(toTransform.item[0])?.getRichText();
			// if (confItemOp.item === toTransform.item[0] && rt) {
			if (confItemOp.item === toTransform.item[0]) {
				for (const transfOp of toTransform.ops) {
					let actualyTransformed = { ...transfOp };

					for (const confOp of confItemOp.ops) {
						const transformFunction =
							operationTransformMap[confOp.type]?.[
								actualyTransformed.type
							];
						const transformed =
							transformFunction &&
							transformFunction(confOp, actualyTransformed);
						// transformFunction(confOp, actualyTransformed, rt.editor.editor);

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
		const transformedItemsOps = toTransform.itemsOps.map(
			toTransformItemOp => {
				const transformedOps: SlateOp[] = [];

				// const rt = board.items.getById(toTransformItemOp.item)?.getRichText();
				// if (confirmed.item[0] === toTransformItemOp.item && rt ) {
				if (confirmed.item[0] === toTransformItemOp.item) {
					for (const transfOp of toTransformItemOp.ops) {
						let actualyTransformed = { ...transfOp };

						for (const confOp of confirmed.ops) {
							const transformFunction =
								operationTransformMap[confOp.type]?.[
									actualyTransformed.type
								];
							const transformed =
								transformFunction &&
								transformFunction(confOp, actualyTransformed);
							// transformFunction(confOp, actualyTransformed, rt.editor.editor);

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
			},
		);

		return {
			...toTransform,
			itemsOps: transformedItemsOps,
		};
	}

	return undefined;
}

export function transfromOperation(
	confirmed: Operation,
	toTransform: Operation,
	// board,
): Operation | undefined {
	if (confirmed.class === "RichText" && toTransform.class === "RichText") {
		return transformRichTextOperation(confirmed, toTransform);
		// return transformRichTextOperation(confirmed, toTransform, board);
	}

	// others

	return undefined;
}
