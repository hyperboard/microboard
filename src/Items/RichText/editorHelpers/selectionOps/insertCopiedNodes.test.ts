import { Editor, Transforms, Node, createEditor } from 'slate';
import { insertCopiedNodes } from './insertCopiedNodes';
import { BlockNode } from 'Items/RichText/Editor/BlockNode';
import { withHistory } from 'slate-history';
import { withReact } from 'slate-react';
import { createParagraphNode } from 'Items/RichText/editorHelpers/common/createParagraphNode';

describe('insertCopiedNodes', () => {
	let editor: Editor;

	beforeEach(() => {
		const baseEditor = createEditor();
		editor = withHistory(withReact(baseEditor));
		// Initialize Slate editor
		editor.children = [createParagraphNode('', editor)];
	});

	it('inserts nodes into an empty editor', () => {
		const nodes: BlockNode[] = [{ type: 'paragraph', children: [{ text: 'Hello world' }] }];

		insertCopiedNodes(editor, nodes);

		expect(editor.children).toEqual(nodes);
	});

	it('inserts text if the node is a single text paragraph', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Existing' }],
			},
		];
		editor.selection = {
			anchor: { offset: 8, path: [0, 0] },
			focus: { offset: 8, path: [0, 0] },
		};
		const nodes: BlockNode[] = [
			{ type: 'paragraph', children: [{ type: 'text', text: ' Hello' }] },
		];

		insertCopiedNodes(editor, nodes);

		const expectedDocument = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Existing Hello' }],
			},
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it('appends nodes if editor already has content', () => {
		editor.children = [{ type: 'paragraph', children: [{ text: 'First' }] }];
		const nodes: BlockNode[] = [{ type: 'paragraph', children: [{ text: 'Second' }] }];

		insertCopiedNodes(editor, nodes);

		expect(editor.children).toHaveLength(2);
		expect(Node.string(editor.children[1])).toBe('Second');
	});

	it('inserts multiple paragraphs correctly', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Existing' }],
			},
		];
		editor.selection = {
			anchor: { offset: 8, path: [0, 0] },
			focus: { offset: 8, path: [0, 0] },
		};
		const nodes: BlockNode[] = [
			{ type: 'paragraph', children: [{ type: 'text', text: ' First' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
		];

		insertCopiedNodes(editor, nodes);

		const expectedDocument = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Existing' }],
			},
			{ type: 'paragraph', children: [{ type: 'text', text: ' First' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it('inserts nodes into first paragraph', () => {
		editor.children = [{ type: 'paragraph', children: [{ type: 'text', text: 'Text' }] }];
		editor.selection = {
			anchor: { offset: 2, path: [0, 0] },
			focus: { offset: 2, path: [0, 0] },
		};
		const nodes: BlockNode[] = [
			{ type: 'paragraph', children: [{ type: 'text', text: '111' }] },
		];

		insertCopiedNodes(editor, nodes);

		const expectedDocument = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Te111xt' }],
			},
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it('inserts node between existing nodes', () => {
		editor.children = [
			{ type: 'paragraph', children: [{ type: 'text', text: 'First' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Third' }] },
		];
		editor.selection = {
			anchor: { offset: 0, path: [1, 0] },
			focus: { offset: 0, path: [1, 0] },
		};

		const nodes: BlockNode[] = [
			{ type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
		];

		insertCopiedNodes(editor, nodes);

		const expectedDocument = [
			{ type: 'paragraph', children: [{ type: 'text', text: 'First' }] },
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'SecondThird' }],
			},
		];

		expect(editor.children).toEqual(expectedDocument);
	});

	it('inserts nodes between existing nodes', () => {
		editor.children = [
			{ type: 'paragraph', children: [{ type: 'text', text: 'First' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Third' }] },
		];
		editor.selection = {
			anchor: { offset: 0, path: [1, 0] },
			focus: { offset: 0, path: [1, 0] },
		};

		const nodes: BlockNode[] = [
			{ type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Fourth' }] },
		];

		insertCopiedNodes(editor, nodes);

		const expectedDocument = [
			{ type: 'paragraph', children: [{ type: 'text', text: 'First' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Fourth' }] },
			{ type: 'paragraph', children: [{ type: 'text', text: 'Third' }] },
		];

		expect(editor.children).toEqual(expectedDocument);
	});
});
