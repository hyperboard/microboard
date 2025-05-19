import { createEditor, Editor } from "slate";
import { MarkdownProcessor } from "./markdownProcessor";
import { BlockNode } from "Board/Items/RichText/Editor/BlockNode";
import { createParagraphNode } from "Board/Items/RichText/editorHelpers/common/createParagraphNode";
import { withReact } from "slate-react";
import { withHistory } from "slate-history";
import { CustomEditor } from "Board/Items/RichText/Editor/Editor.d";
import { selectWholeText } from "Board/Items/RichText/editorHelpers/common/selectWholeText";
import { conf } from "Board/Settings";

describe("MarkdownProcessor Tests", () => {
	let editor: CustomEditor;
	let processor: MarkdownProcessor;

	beforeEach(() => {
		const baseEditor = createEditor();
		editor = withHistory(withReact(baseEditor));
		// Initialize Slate editor
		editor.children = [createParagraphNode("", editor)];
		selectWholeText(editor);

		// Initialize MarkdownProcessor
		processor = new MarkdownProcessor(editor);
	});

	it("should process markdown chunks correctly", async () => {
		// Define a mock markdown input
		const markdownChunks = [
			"# He",
			"ade",
			"r\n\n",
			"Some t",
			"ext",
			"StopProcessingMarkdown",
		];

		// Feed chunks to processor
		markdownChunks.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Define expected nodes
		const expectedNodes: BlockNode[] = [
			{
				type: "heading_one",
				horisontalAlignment: "left",
				paddingTop: 0.5,
				children: [
					{
						type: "text",
						text: "Header",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
						fontSize: 18,
					},
				],
			},
			{
				type: "paragraph",
				horisontalAlignment: "left",
				paddingTop: 0.5,
				children: [
					{
						type: "text",
						text: "Some text",
						...conf.DEFAULT_TEXT_STYLES,
					},
				],
			},
		];

		// Assert the final structure of editor contents
		expect(editor.children).toEqual(expectedNodes);
	});

	it("should handle stop processing correctly", async () => {
		// Process markdown and stop processing
		processor.processMarkdown("# Tes");
		processor.processMarkdown("t\n\nStopProcessingMarkdown");

		// Wait for async processing
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Define expected nodes after stop
		const expectedNodesPostStop: BlockNode[] = [
			{
				type: "heading_one",
				horisontalAlignment: "left",
				paddingTop: 0.5,
				children: [
					{
						type: "text",
						text: "Test",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
						fontSize: 18,
					},
				],
			},
			{
				type: "paragraph",
				children: [{ type: "text", text: "" }],
			},
		];

		// Assert the final structure of editor contents except incomplete processing
		expect(editor.children).toEqual(expectedNodesPostStop);
	});

	it("should process unordered list correctly", async () => {
		// Define a mock markdown input for unordered list
		const unorderedListMarkdown = [
			"- Item 1",
			"  \n",
			"- Item 2",
			"  \n",
			"- Item 3",
			"StopProcessingMarkdown",
		];

		// Feed chunks to processor
		unorderedListMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Define expected nodes for unordered list
		const expectedUnorderedListNodes: BlockNode[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								horisontalAlignment: "left",
								paddingTop: 0.5,
								children: [
									{
										type: "text",
										text: "Item 1",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								horisontalAlignment: "left",
								paddingTop: 0.5,
								children: [
									{
										type: "text",
										text: "Item 2",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								horisontalAlignment: "left",
								paddingTop: 0.5,
								children: [
									{
										type: "text",
										text: "Item 3",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
				],
			},
		];

		// Assert the final structure of editor contents
		expect(editor.children).toEqual(expectedUnorderedListNodes);
	});

	it("should process ordered list correctly", async () => {
		// Define a mock markdown input for ordered list
		const orderedListMarkdown = [
			"1. First",
			"  \n",
			"2. Second",
			"  \n",
			"3. Third",
			"StopProcessingMarkdown",
		];

		// Feed chunks to processor
		orderedListMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Define expected nodes for ordered list
		const expectedOrderedListNodes: BlockNode[] = [
			{
				type: "ol_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								horisontalAlignment: "left",
								paddingTop: 0.5,
								children: [
									{
										type: "text",
										text: "First",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								horisontalAlignment: "left",
								paddingTop: 0.5,
								children: [
									{
										type: "text",
										text: "Second",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								type: "paragraph",
								horisontalAlignment: "left",
								paddingTop: 0.5,
								children: [
									{
										type: "text",
										text: "Third",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
				],
			},
		];

		// Assert the final structure of editor contents
		expect(editor.children).toEqual(expectedOrderedListNodes);
	});

	it("should process nested lists correctly", async () => {
		const nestedListMarkdown = [
			"- Parent Item 1\n",
			"  - Child Item 1\n",
			"  - Child Item 2\n",
			"- Parent Item 2\n",
			"StopProcessingMarkdown",
		];

		nestedListMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedNestedListNodes: BlockNode[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Parent Item 1",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
							{
								type: "ul_list",
								listLevel: 2,
								children: [
									{
										type: "list_item",
										children: [
											{
												paddingTop: 0.5,
												horisontalAlignment: "left",
												type: "paragraph",
												children: [
													{
														type: "text",
														text: "Child Item 1",
														...conf.DEFAULT_TEXT_STYLES,
													},
												],
											},
										],
									},
									{
										type: "list_item",
										children: [
											{
												paddingTop: 0.5,
												horisontalAlignment: "left",
												type: "paragraph",
												children: [
													{
														type: "text",
														text: "Child Item 2",
														...conf.DEFAULT_TEXT_STYLES,
													},
												],
											},
										],
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Parent Item 2",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedNestedListNodes);
	});

	it("should process headers of different levels correctly", async () => {
		const headersMarkdown = [
			"# Header 1\n",
			"## Header 2\n",
			"### Header 3\n",
			"StopProcessingMarkdown",
		];

		headersMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedHeaderNodes: BlockNode[] = [
			{
				type: "heading_one",
				paddingTop: 0.5,
				horisontalAlignment: "left",
				children: [
					{
						type: "text",
						text: "Header 1",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
						fontSize: 18,
					},
				],
			},
			{
				type: "heading_two",
				paddingTop: 0.5,
				horisontalAlignment: "left",
				children: [
					{
						type: "text",
						text: "Header 2",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
						fontSize: 17,
					},
				],
			},
			{
				type: "heading_three",
				paddingTop: 0.5,
				horisontalAlignment: "left",
				children: [
					{
						type: "text",
						text: "Header 3",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
						fontSize: 16,
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedHeaderNodes);
	});

	it("should process bold text correctly", async () => {
		const boldMarkdown = [
			"**Bold Text**",
			"More Text",
			"StopProcessingMarkdown",
		];

		boldMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedBoldTextNodes: BlockNode[] = [
			{
				type: "paragraph",
				paddingTop: 0.5,
				horisontalAlignment: "left",
				children: [
					{
						type: "text",
						text: "Bold Text ",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
					},
					{
						type: "text",
						text: "More Text",
						...conf.DEFAULT_TEXT_STYLES,
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedBoldTextNodes);
	});

	it("should process code block correctly", async () => {
		const codeBlockMarkdown = [
			"```\n",
			"const a = 10;\n",
			"console.log(a);\n",
			"```\n",
			"StopProcessingMarkdown",
		];

		codeBlockMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedCodeBlockNodes: BlockNode[] = [
			{
				type: "code_block",
				language: null,
				horisontalAlignment: "left",
				children: [
					{
						type: "text",
						text: "const a = 10;\nconsole.log(a);",
						...conf.DEFAULT_TEXT_STYLES,
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedCodeBlockNodes);
	});

	it("should process headers within lists correctly", async () => {
		const headersInListMarkdown = [
			"- List Item 1\n",
			"  # Subheader 1\n",
			"- List Item 2\n",
			"  ## Subheader 2\n",
			"StopProcessingMarkdown",
		];

		headersInListMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedHeadersInListNodes: BlockNode[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "List Item 1",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
							{
								horisontalAlignment: "left",
								type: "heading_one",
								children: [
									{
										type: "text",
										text: "Subheader 1",
										...conf.DEFAULT_TEXT_STYLES,
										bold: true,
										fontSize: 18,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "List Item 2",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
							{
								horisontalAlignment: "left",
								type: "heading_two",
								children: [
									{
										type: "text",
										text: "Subheader 2",
										...conf.DEFAULT_TEXT_STYLES,
										bold: true,
										fontSize: 17,
									},
								],
							},
						],
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedHeadersInListNodes);
	});

	it("should process code blocks within lists correctly", async () => {
		const codeBlockInListMarkdown = [
			"- Code List Item\n",
			"  ```\n",
			"  let x = 5;\n",
			"  console.log(x);\n",
			"  ```\n",
			"- Another List Item\n",
			"StopProcessingMarkdown",
		];

		codeBlockInListMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedCodeBlockInListNodes: BlockNode[] = [
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Code List Item",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
							{
								horisontalAlignment: "left",
								type: "code_block",
								language: null,
								children: [
									{
										type: "text",
										text: "let x = 5;\nconsole.log(x);",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Another List Item",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedCodeBlockInListNodes);
	});

	it("should process ordered list, followed by a paragraph, a header, and an unordered list correctly", async () => {
		const complexStructureMarkdown = [
			"1. Ordered Item 1\n",
			"2. Ordered Item 2\n",
			"\n", // paragraph separator
			"This is a paragraph.\n",
			"\n",
			"# Header After Paragraph\n",
			"\n",
			"- Unordered Item 1\n",
			"- Unordered Item 2\n",
			"StopProcessingMarkdown",
		];

		complexStructureMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedComplexStructureNodes: BlockNode[] = [
			{
				type: "ol_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Ordered Item 1",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Ordered Item 2",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
				],
			},
			{
				paddingTop: 0.5,
				horisontalAlignment: "left",
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "This is a paragraph.",
						...conf.DEFAULT_TEXT_STYLES,
					},
				],
			},
			{
				paddingTop: 0.5,
				horisontalAlignment: "left",
				type: "heading_one",
				children: [
					{
						type: "text",
						text: "Header After Paragraph",
						...conf.DEFAULT_TEXT_STYLES,
						bold: true,
						fontSize: 18,
					},
				],
			},
			{
				type: "ul_list",
				listLevel: 1,
				children: [
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Unordered Item 1",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
					{
						type: "list_item",
						children: [
							{
								paddingTop: 0.5,
								horisontalAlignment: "left",
								type: "paragraph",
								children: [
									{
										type: "text",
										text: "Unordered Item 2",
										...conf.DEFAULT_TEXT_STYLES,
									},
								],
							},
						],
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedComplexStructureNodes);
	});

	it("should process hyperlinks correctly", async () => {
		const hyperlinkMarkdown = [
			"This is ",
			"a [li",
			"nk]",
			"(https:/",
			"/example.",
			"com) in a paragraph.",
			"\n\n",
			"Another [example link](https://example.org)",
			"StopProcessingMarkdown",
		];

		hyperlinkMarkdown.forEach(chunk => {
			processor.processMarkdown(chunk);
		});

		await new Promise(resolve => setTimeout(resolve, 1000));

		const expectedHyperlinkNodes: BlockNode[] = [
			{
				paddingTop: 0.5,
				horisontalAlignment: "left",
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "This is a ",
						...conf.DEFAULT_TEXT_STYLES,
					},
					{
						type: "text",
						link: "https://example.com",
						text: "link",
						...conf.DEFAULT_TEXT_STYLES,
						fontColor: "rgba(71, 120, 245, 1)",
					},
					{
						type: "text",
						text: " in a paragraph.",
						...conf.DEFAULT_TEXT_STYLES,
					},
				],
			},
			{
				paddingTop: 0.5,
				horisontalAlignment: "left",
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "Another ",
						...conf.DEFAULT_TEXT_STYLES,
					},
					{
						type: "text",
						text: "example link",
						link: "https://example.org",
						...conf.DEFAULT_TEXT_STYLES,
						fontColor: "rgba(71, 120, 245, 1)",
					},
				],
			},
		];

		expect(editor.children).toEqual(expectedHyperlinkNodes);
	});
});
