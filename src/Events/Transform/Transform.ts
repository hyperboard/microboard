/* eslint-disable @typescript-eslint/naming-convention */
import { removeText_removeText } from "./removeText_removeText";
import { insertText_insertText } from "./insertText_insertText";
import { removeText_insertText } from "./removeText_insertText";
import { splitNode_insertText } from "./splitNode_insertText";
import { removeNode_insertText } from "./removeNode_insertText";
import { insertNode_insertText } from "./insertNode_insertText";
import { mergeNode_insertText } from "./mergeNode_insertText";
import { insertText_removeText } from "./insertText_removeText";
import { insertNode_removeText } from "./insertNode_removeText";
import { splitNode_removeText } from "./splitNode_removeText";
import { mergeNode_removeText } from "./mergeNode_removeText";
import { removeNode_removeText } from "./removeNode_removeText";
import { insertText_insertNode } from "./insertText_insertNode";
import { insertText_removeNode } from "./insertText_removeNode";
import { removeText_insertNode } from "./removeText_insertNode";
import { removeText_removeNode } from "./removeText_removeNode";
import { insertNode_insertNode } from "./insertNode_insertNode";
import { insertNode_removeNode } from "./insertNode_removeNode";
import { removeNode_insertNode } from "./removeNode_insertNode";
import { removeNode_removeNode } from "./removeNode_removeNode";
import { splitNode_insertNode } from "./splitNode_insertNode";
import { splitNode_removeNode } from "./splitNode_removeNode";
import { mergeNode_insertNode } from "./mergeNode_insertNode";
import { mergeNode_removeNode } from "./mergeNode_removeNode";
import { setNode_insertNode } from "./setNode_insertNode";
import { setNode_removeNode } from "./setNode_removeNode";
import { insertText_mergeNode } from "./insertText_mergeNode";
import { removeText_mergeNode } from "./removeText_mergeNode";
import { insertNode_mergeNode } from "./insertNode_mergeNode";
import { removeNode_mergeNode } from "./removeNode_mergeNode";
import { splitNode_mergeNode } from "./splitNode_mergeNode";
import { mergeNode_mergeNode } from "./mergeNode_mergeNode";
import { insertText_splitNode } from "./insertText_splitNode";
import { removeText_splitNode } from "./removeText_splitNode";
import { insertNode_splitNode } from "./insertNode_splitNode";
import { removeNode_splitNode } from "./removeNode_splitNode";
import { mergeNode_splitNode } from "./mergeNode_splitNode";
import { splitNode_splitNode } from "./splitNode_splitNode";
import { setNode_splitNode } from "./setNode_splitNode";
import { splitNode_setNode } from "./splitNode_setNode";
import { mergeNode_setNode } from "./mergeNode_setNode";
import { insertNode_setNode } from "./insertNode_setNode";
import { removeNode_setNode } from "./removeNode_setNode";
import { setNode_setNode } from "./setNode_setNode";
import { RichTextOperation } from "Board/Items";
import { Operation } from "../EventsOperations";
import {
	NodeOperation,
	Operation as SlateOp,
	TextOperation,
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
export type SlateOpsToTransform = Exclude<
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

export function transformRichTextOperation(
	confirmed: RichTextOperation,
	toTransform: RichTextOperation,
	// board: Board,
): RichTextOperation | undefined {
	console.log("transformRichTextOperation");
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

		console.log("RETURNING TRANSAOFRMED...", {
			...toTransform,
			itemsOps: transformedItemsOps,
		});

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
		console.log("RETURNING TRANSAOFRMED...", {
			...toTransform,
			ops: transformedOps,
		});

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

		console.log("RETURNING TRANSAOFRMED...", {
			...toTransform,
			ops: transformedOps,
		});

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

		console.log("RETURNING TRANSAOFRMED...", {
			...toTransform,
			itemsOps: transformedItemsOps,
		});
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
	console.log("transfromOperation");
	if (confirmed.class === "RichText" && toTransform.class === "RichText") {
		return transformRichTextOperation(confirmed, toTransform);
		// return transformRichTextOperation(confirmed, toTransform, board);
	}

	// others

	return undefined;
}
