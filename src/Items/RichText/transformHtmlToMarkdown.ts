import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";

export const transformHtmlToMarkdown = async (html: string) => {
	const file = await unified()
		.use(rehypeParse, { fragment: true })
		.use(rehypeRemark)
		.use(remarkStringify)
		.process(html);

	return String(file);
};
