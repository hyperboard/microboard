import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import markdown from "remark-parse";
import slate from "remark-slate";
import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { setNodeStyles } from "Board/Items/RichText/setNodeStyles";
import { TextNode } from "Board/Items/RichText/Editor/TextNode";
import { DEFAULT_TEXT_STYLES } from "./RichText";
import { conf } from "Board/Settings";

export const transformHtmlOrTextToMarkdown = async (
	text: string,
	html?: string,
) => {
	let markdownString = text;
	if (html) {
		const file = await unified()
			.use(rehypeParse, { fragment: true })
			.use(rehypeRemark)
			.use(remarkStringify)
			.process(html);
		markdownString = String(file).trim();
	}

	let slateNodes: BlockNode[] | TextNode[] = [];

	if (conf.URL_REGEX.test(text)) {
		slateNodes = [createLinkNode(text)];
	} else {
		slateNodes = await convertMarkdownToSlate(
			markdownString.replace(/<!--(Start|End)Fragment-->/g, ""),
		);
	}

	const data = new DataTransfer();

	// const jsonString = JSON.stringify(slateNodes);
	// const buf = Buffer.from(encodeURIComponent(jsonString));
	// const encoded = buf.toString("base64");
	// Smell: window
	const encoded = window.btoa(encodeURIComponent(JSON.stringify(slateNodes)));
	data.setData("application/x-slate-fragment", encoded);
	data.setData("text/plain", text);

	return data;
};

function createLinkNode(link: string): TextNode {
	return {
		type: "text",
		link,
		text: link,
		...DEFAULT_TEXT_STYLES,
		fontColor: "rgba(71, 120, 245, 1)",
	};
}

async function convertMarkdownToSlate(text: string) {
	if (!text) {
		throw new Error("No text to convert");
	}

	const file = await unified().use(markdown).use(slate).process(text);

	if (!file || !file.result) {
		throw new Error("Failed to process Markdown");
	}

	let nodes: BlockNode[] = file.result as BlockNode[];

	if (nodes.some(node => node.type === "list_item")) {
		const listType = detectListType(text);
		nodes = [
			{
				type: listType,
				children: nodes.filter(node => node.type === "list_item"),
			},
			...nodes.filter(node => node.type !== "list_item"),
		];
	}

	if (
		nodes[0] &&
		(nodes[0].type === "ol_list" || nodes[0].type === "ul_list")
	) {
		nodes.unshift({
			type: "paragraph",
			children: [{ type: "text", text: "", ...DEFAULT_TEXT_STYLES }],
			horisontalAlignment: "left",
		});
	}

	return nodes.map(item => {
		setNodeStyles({
			node: item,
			isPaddingTopNeeded: item.type !== "code_block",
		});
		return item;
	});
}

function detectListType(text: string): "ol_list" | "ul_list" {
	const lines = text.split("\n").filter(Boolean);

	for (const line of lines) {
		if (/^(\d+)\.\s/.test(line)) {
			return "ol_list";
		}
		if (/^[-*+]\s/.test(line)) {
			return "ul_list";
		}
	}

	return "ul_list";
}
