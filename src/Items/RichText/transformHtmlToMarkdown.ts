import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import markdown from "remark-parse";
import slate from "remark-slate";
import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { setNodeStyles } from "Board/Items/RichText/setNodeStyles";

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

	const slateNodes = convertMarkdownToSlate(
		markdownString.replace(/<!--(Start|End)Fragment-->/g, ""),
	);

	const data = new DataTransfer();

	const encoded = window.btoa(encodeURIComponent(JSON.stringify(slateNodes)));
	data.setData("application/x-slate-fragment", encoded);
	data.setData("text/plain", text);

	return data;
};

function convertMarkdownToSlate(text: string) {
	if (!text) {
		throw new Error("No text to convert");
	}

	const nodes: BlockNode[] = [];

	unified()
		.use(markdown)
		.use(slate)
		.process(text, (err, file) => {
			if (err || !file) {
				throw err;
			}

			(file.result as BlockNode[]).forEach((item: BlockNode) => {
				setNodeStyles({
					node: item,
					isPaddingTopNeeded: item.type !== "code_block",
				});
				nodes.push(item);
			});
		});

	return nodes;
}
