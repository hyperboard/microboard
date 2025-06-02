import { Editor, createEditor } from 'slate';
import { withReact } from 'slate-react';
import { setSelectionFontHighlight } from './setSelectionFontHighlight';
import { withHistory } from 'slate-history';
import { createParagraphNode } from 'Items/RichText/editorHelpers/common/createParagraphNode';
import { ReactEditor } from 'slate-react';
import { getSelectionMarks } from 'Items/RichText/editorHelpers/common/getSelectionMarks';

describe('setSelectionFontHighlight', () => {
	let editor: Editor;

	beforeEach(() => {
		const baseEditor = createEditor();
		editor = withHistory(withReact(baseEditor));
		// Initialize Slate editor with empty paragraph
		editor.children = [createParagraphNode('', editor)];
		jest.clearAllMocks();
	});

	it('throws error when editor is not initialized', () => {
		expect(() => setSelectionFontHighlight(null as unknown as Editor, 'yellow')).toThrow(
			'Editor is not initialized'
		);
	});

	it('adds highlight when none exists', () => {
		editor.children = [{ type: 'paragraph', children: [{ text: 'Test text' }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 9 },
		};

		setSelectionFontHighlight(editor, 'yellow');

		expect(getSelectionMarks(editor)).toEqual({ fontHighlight: 'yellow' });
	});

	it('changes existing highlight to new color', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ text: 'Highlighted text', fontHighlight: 'blue' }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 16 },
		};

		setSelectionFontHighlight(editor, 'green');

		expect(getSelectionMarks(editor)).toEqual({ fontHighlight: 'green' });
	});

	it('removes highlight when setting same color', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ text: 'Highlighted text', fontHighlight: 'blue' }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 16 },
		};

		setSelectionFontHighlight(editor, 'blue');

		expect(getSelectionMarks(editor)).toEqual({});
	});

	it("removes highlight when format is 'none'", () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ text: 'Highlighted text', fontHighlight: 'blue' }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 16 },
		};

		setSelectionFontHighlight(editor, 'none');

		expect(editor.marks).toBeNull();
	});

	it('handles partial selection with different highlights', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [
					{ text: 'Red ', fontHighlight: 'red' },
					{ text: 'Blue', fontHighlight: 'blue' },
				],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 2 },
			focus: { path: [0, 1], offset: 2 },
		};

		setSelectionFontHighlight(editor, 'green');

		expect(editor.children).toEqual([
			{
				type: 'paragraph',
				children: [
					{ text: 'Re', fontHighlight: 'red' },
					{ text: 'd Bl', fontHighlight: 'green' },
					{ text: 'ue', fontHighlight: 'blue' },
				],
			},
		]);
	});

	it('does nothing when selection is null', () => {
		editor.children = [{ type: 'paragraph', children: [{ text: 'Test' }] }];
		editor.selection = null;

		expect(() => {
			setSelectionFontHighlight(editor, 'yellow');
		}).not.toThrow();
	});
});
