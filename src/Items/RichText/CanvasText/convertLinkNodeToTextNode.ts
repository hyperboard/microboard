import { LinkNode, TextNode } from "../Editor/TextNode";

// needed while we cant create hyperlink

export const convertLinkNodeToTextNode = (
	node: LinkNode | TextNode,
): TextNode => {
	if (node.type === "text" || !node.type || "text" in node) {
		return { ...node, type: "text" };
	}
	const link = node.link;
	const nodeCopy = { ...node };
	delete nodeCopy.children;
	return { ...nodeCopy, type: "text", text: link };
};
