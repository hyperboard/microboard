import { MergeNodeOperation, InsertTextOperation, Path } from "slate";
import { transformPath } from "./Transform";

// TODO NEED TO FIX
export function mergeNode_insertText(
	confirmed: MergeNodeOperation,
	toTransform: InsertTextOperation,
): InsertTextOperation {
	console.log("mergeNode_insertText");
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
