import { BlockNode } from "../../Editor/BlockNode.ts";

export function getAreAllChildrenEmpty(node: BlockNode): boolean {
	if ("text" in node) {
		return !node.text;
	}
	if ("children" in node) {
		return node.children.every(child => getAreAllChildrenEmpty(child));
	}
	return false;
}
