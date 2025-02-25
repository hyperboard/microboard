import { LinkNode, TextNode } from "../Editor/TextNode";

export function validateLinkOrTextNode<T extends LinkNode | TextNode>(
	node: T,
): T {
	if (node.type === "text" || "text" in node) {
		return { ...node, type: "text" };
	}
	const children = node.children;
	if (children && children.length > 0) {
		if (children.some(child => child.text.trim())) {
			return {
				...node,
				children: children.map(child => validateLinkOrTextNode(child)),
			};
		}
		children[0].text = node.link;
		return node;
	}
	return { ...node, children: [{ type: "text", text: node.link }] };
}
