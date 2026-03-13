import { Editor, createEditor } from 'slate';
import { setSelectionFontStyle } from './setSelectionFontStyle';
import { TextStyle } from 'Items/RichText/Editor/TextNode';
import { getSelectionMarks } from 'Items/RichText/editorHelpers/common/getSelectionMarks';
import { selectWholeText } from 'Items/RichText/editorHelpers/common/selectWholeText';

describe('setSelectionFontStyle', () => {
	let editor: Editor;

	beforeEach(() => {
		editor = createEditor();
	});

	it('applies style when no text has it', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Normal text' }],
			},
		];
		selectWholeText(editor);

		setSelectionFontStyle(editor, 'bold');

		expect((editor.children[0] as any).children[0].bold).toBe(true);
	});

	it('removes style when all text has it', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Bold text', bold: true }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 9 },
		};

		setSelectionFontStyle(editor, 'bold');

		expect((editor.children[0] as any).children[0].bold).toBe(false);
	});

	it('applies style when some text has it', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [
					{ type: 'text', text: 'Partial ', bold: true },
					{ type: 'text', text: 'text' },
				],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 1], offset: 4 },
		};

		setSelectionFontStyle(editor, 'bold');

		expect(getSelectionMarks(editor)?.bold).toEqual(true);
	});

	it('handles multiple styles in one call', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Sample text', italic: true }],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 11 },
		};

		setSelectionFontStyle(editor, ['bold', 'italic']);

		const node = (editor.children[0] as any).children[0];
		expect(node.bold).toBe(true);
		expect(node.italic).toBe(false);
	});

	it('handles empty selection gracefully', () => {
		editor.children = [{ type: 'paragraph', children: [{ type: 'text', text: 'Test' }] }];
		editor.selection = null;

		expect(() => {
			setSelectionFontStyle(editor, 'underline');
		}).not.toThrow();
	});

	it('works with multiple paragraphs', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'First', bold: true }],
			},
			{ type: 'paragraph', children: [{ type: 'text', text: 'Second' }] },
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [1, 0], offset: 6 },
		};

		setSelectionFontStyle(editor, 'bold');

		expect(getSelectionMarks(editor)?.bold).toEqual(true);
	});

	it('toggles style correctly in mixed content', () => {
		editor.children = [
			{
				type: 'paragraph',
				children: [
					{ type: 'text', text: 'Mixed ', bold: true, italic: false },
					{
						type: 'text',
						text: 'content',
						bold: false,
						italic: true,
					},
				],
			},
		];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 1], offset: 7 },
		};

		// First call should apply both styles since they're mixed
		setSelectionFontStyle(editor, ['bold', 'italic']);
		// Slate may merge adjacent nodes with identical marks after normalization
		const children1 = (editor.children[0] as any).children;
		children1.forEach((child: any) => {
			expect(child.bold).toBe(true);
			expect(child.italic).toBe(true);
		});

		// Second call should remove both styles since they're now all applied
		setSelectionFontStyle(editor, ['bold', 'italic']);
		const children2 = (editor.children[0] as any).children;
		children2.forEach((child: any) => {
			expect(child.bold).toBe(false);
			expect(child.italic).toBe(false);
		});
	});

	it('handles all TextStyles correctly', () => {
		const allStyles: TextStyle[] = [
			'bold',
			'italic',
			'underline',
			'line-through',
			'overline',
			'subscript',
			'superscript',
		];

		editor.children = [{ type: 'paragraph', children: [{ type: 'text', text: 'Test' }] }];
		editor.selection = {
			anchor: { path: [0, 0], offset: 0 },
			focus: { path: [0, 0], offset: 4 },
		};

		allStyles.forEach(style => {
			// Apply style
			setSelectionFontStyle(editor, style);
			expect((editor.children[0] as any).children[0][style]).toBe(true);
		});
	});
});
