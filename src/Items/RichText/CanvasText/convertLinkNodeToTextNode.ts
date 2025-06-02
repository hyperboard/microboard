import { LinkNode, TextNode } from '../Editor/TextNode';

import { conf } from 'Settings';

export const convertLinkNodeToTextNode = (node: LinkNode | TextNode): TextNode => {
	if (node.type === 'text' || 'text' in node) {
		return { ...node, type: 'text' };
	}
	const link = node.link;
	const text = node.children.map(child => child.text).join('');

	return {
		...conf.DEFAULT_TEXT_STYLES,
		type: 'text',
		text,
		link,
		overline: false,
		subscript: false,
		superscript: false,
	};
};
