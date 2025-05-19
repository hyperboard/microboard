import { Editor, Transforms } from "slate";
import { unified } from "unified";
import markdown from "remark-parse";
import slate from "remark-slate";
import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { setNodeStyles } from "Board/Items/RichText/setNodeStyles";
import { conf } from "Board/Settings";
import { selectWholeText } from "Board/Items/RichText/editorHelpers/common/selectWholeText";
import { createParagraphNode } from "Board/Items/RichText/editorHelpers/common/createParagraphNode";
import { clearText } from "Board/Items/RichText/editorHelpers/common/clearText";
import { isTextEmpty } from "Board/Items/RichText/editorHelpers/common/isTextEmpty";
import { Subject } from "shared/Subject";
const { i18n } = conf;

export class MarkdownProcessor {
	private chunksQueue: string[] = [];
	private isProcessingChunk = false;
	private stopProcessingMarkDownCb: (() => void) | null = null;
	private currentNode = "";
	editor: Editor;
	readonly subject = new Subject<MarkdownProcessor>();

	constructor(editor: Editor) {
		this.editor = editor;
	}

	setStopProcessingMarkDownCb(cb: (() => void) | null) {
		this.stopProcessingMarkDownCb = cb;
	}

	getStopProcessingMarkDownCb() {
		return this.stopProcessingMarkDownCb;
	}

	deserializeMarkdown(isNewParagraphNeeded: boolean) {
		const lastNode = this.getText()[this.getText().length - 1];
		if (lastNode.type !== "paragraph") {
			this.subject.publish(this);
			return true;
		}

		const text: string | undefined = lastNode.children[0]?.text;

		if (!text) {
			Transforms.insertNodes(
				this.editor,
				createParagraphNode("", this.editor),
				{
					at: [0],
				},
			);
			this.subject.publish(this);
			return true;
		}

		if (i18n.t && text.startsWith(i18n.t("AIInput.generatingResponse"))) {
			return true;
		}

		const isPrevTextEmpty = isTextEmpty(this.editor.children);

		if (!isPrevTextEmpty) {
			Transforms.removeNodes(this.editor, {
				at: [this.getText().length - 1],
			});
		}

		unified()
			.use(markdown)
			.use(slate)
			.process(text, (err, file) => {
				if (err || !file) {
					throw err;
				}

				const nodes = (file.result as BlockNode[]).map(
					(item: BlockNode) => {
						setNodeStyles({
							node: item,
							editor: this.editor,
							horisontalAlignment: "left",
							isPaddingTopNeeded: item.type !== "code_block",
						});
						return item;
					},
				);
				if (isNewParagraphNeeded) {
					nodes.push(createParagraphNode("", this.editor));
				}

				Transforms.insertNodes(this.editor, nodes, {
					at: [this.getText().length],
				});
			});

		this.subject.publish(this);
		return true;
	}

	processMarkdown(chunk: string): boolean {
		this.chunksQueue.push(chunk);

		if (!this.isProcessingChunk) {
			this.processNextChunk();
		}

		return true;
	}

	private async processNextChunk() {
		if (this.chunksQueue.length === 0) {
			this.isProcessingChunk = false;
			return;
		}

		this.isProcessingChunk = true;
		const chunk = this.chunksQueue.shift()!;

		if (chunk === "StopProcessingMarkdown") {
			await this.deserializeMarkdownAsync(false);
			this.isProcessingChunk = false;
			this.currentNode = "";
			if (this.stopProcessingMarkDownCb) {
				selectWholeText(this.editor);
				this.stopProcessingMarkDownCb();
				this.stopProcessingMarkDownCb = null;
			}
			return;
		}

		const prevText =
			this.getText()?.[this.getText().length - 1]?.children[0]?.text;
		if (
			i18n.t &&
			prevText?.startsWith(i18n.t("AIInput.generatingResponse"))
		) {
			clearText(this.editor);
		}

		if (chunk.includes("\n\n")) {
			// // sometimes we get paragraphs that starts with 2. 3. ... so markdown transformer thinks that it is a list element and changes index to 1.
			const numberedListItemRegex = /^\d+\.\s/;
			if (numberedListItemRegex.test(this.currentNode)) {
				this.insertChunk(chunk);
			} else {
				this.insertChunk(chunk.split("\n\n")[0]);
				await this.deserializeMarkdownAsync();
			}
			this.currentNode = "";
		} else {
			this.currentNode += chunk;
			this.insertChunk(chunk);
		}
		setTimeout(() => this.processNextChunk(), 0);
	}

	private async deserializeMarkdownAsync(isNewParagraphNeeded = true) {
		return new Promise(resolve => {
			setTimeout(() => {
				this.deserializeMarkdown(isNewParagraphNeeded);
				resolve(true);
			}, 0);
		});
	}

	insertChunk(text: string): boolean {
		const lines = text.split(/\r\n|\r|\n/);
		const combinedText = lines.join("\n");
		const isPrevTextEmpty = isTextEmpty(this.editor.children);

		if (isPrevTextEmpty) {
			this.editor.insertText(combinedText);
		} else {
			const lastParagraphPath = this.getText().length - 1;
			const lastParagraph = this.getText()[lastParagraphPath];

			const insertLocation = {
				path: [lastParagraphPath, lastParagraph.children.length - 1],
				offset: lastParagraph.children[
					lastParagraph.children.length - 1
				].text.length,
			};

			Transforms.insertText(this.editor, combinedText, {
				at: insertLocation,
			});
		}
		this.subject.publish(this);

		return true;
	}

	getText(): BlockNode[] {
		return this.editor.children as BlockNode[];
	}
}
