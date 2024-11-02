import { validateItemsMap } from "Board/Validators";
import { findCommonStrings } from "lib/findCommonStrings";
import {
	BaseEditor,
	createEditor,
	Descendant,
	Editor,
	Element,
	Operation as SlateOp,
	Range,
	Transforms,
	BaseSelection,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import { ReactEditor, withReact } from "slate-react";
import { Subject } from "Subject";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { BlockNode, BlockType, ListType, ListTypes } from "./Editor/BlockNode";
import { TextNode, TextStyle } from "./Editor/TextNode";
import { DefaultTextStyles } from "./RichText";
import { operationsRichTextDebugEnabled } from "./RichTextDebugSettings";
import {
	RichTextOperation,
	SelectionMethod,
	SelectionOp,
	WholeTextOp,
} from "./RichTextOperations";
import { Node } from "slate";
import { Text } from "slate";

export class EditorContainer {
	readonly editor: BaseEditor & ReactEditor & HistoryEditor;

	maxWidth: number | undefined = undefined;
	textScale = 1;
	verticalAlignment: VerticalAlignment = "center";
	textLength = 0;

	private decorated = {
		realapply: (_operation: SlateOp): void => {},

		apply: (_operation: SlateOp): void => {},

		undo: (): void => {},

		redo: (): void => {},
	};

	private shouldEmit = true;
	private recordedSelectionOp: SelectionOp | undefined = undefined;
	readonly subject = new Subject<EditorContainer>();

	private insertingText = false;
	private recordedInsertionOps: SlateOp[] = [];

	constructor(
		private id: string,
		private emit: (op: RichTextOperation) => void,
		private emitWithoutApplying: (op: RichTextOperation) => void,
		undo: () => void,
		redo: () => void,
		private getScale: () => number,
		horisontalAlignment: HorisontalAlignment,
		private initialTextStyles: DefaultTextStyles,
		private getAutosize: () => boolean,
		private isEmpty: () => boolean,
		private autosizeEnable: () => void,
		private autosizeDisable: () => void,
		private getFontSize: () => number,
		private getMatrixScale: () => number,
		private getOnLimitReached: () => () => void,
	) {
		this.editor = withHistory(withReact(createEditor()));
		const editor = this.editor;
		/** The editor must have initial descendants */
		// horizontalAlignment for Shape - center, for RichText - left
		editor.children = [
			{
				type: "paragraph",
				horisontalAlignment,
				children: [
					{
						type: "text",
						text: "",
						...initialTextStyles,
						overline: false,
						lineThrough: false,
						subscript: false,
						superscript: false,
					},
				],
			},
		];
		/** We save methods that we going to decorate */
		this.decorated = {
			realapply: editor.apply,
			apply: op => {
				if (
					op.type === "set_node" &&
					"enableAuto" in op.newProperties
				) {
					if (op.newProperties.enableAuto) {
						this.autosizeEnable();
					} else if (op.newProperties.enableAuto === false) {
						this.autosizeDisable();
					}
				}
				this.decorated.realapply(op);
				this.subject.publish(this);
			},
			undo: editor.undo,
			redo: editor.redo,
		};
		/** We decorate methods */
		editor.apply = (operation: SlateOp): void => {
			if (this.shouldEmit) {
				if (this.recordedSelectionOp) {
					if (operation.type !== "set_selection") {
						if (
							operation.type === "set_node" &&
							"fontSize" in operation.newProperties &&
							"fontSize" in operation.properties
						) {
							if (operation.newProperties.fontSize === "auto") {
								operation.newProperties.fontSize = 14;
								operation.newProperties.enableAuto = true;
								operation.properties.enableAuto = false;
							} else {
								operation.newProperties.enableAuto = false;
								if (this.getAutosize()) {
									operation.properties.enableAuto = true;
								}
							}
						}
						this.recordedSelectionOp.ops.push(operation);
						this.subject.publish(this);
					}
					return;
				} else {
					if (operation.type === "set_selection") {
						this.decorated.apply(operation);
						this.subject.publish(this);
					} else if (this.id !== "") {
						if (this.insertingText) {
							this.recordedInsertionOps.push(operation);
							this.decorated.apply(operation);
						} else {
							if (
								operation.type !== "remove_node" &&
								operation.type !== "remove_text" &&
								operation.type !== "merge_node" &&
								operation.type !== "set_node" &&
								this.getAutosize()
							) {
								const relativeFontSize =
									this.getFontSize() / this.getMatrixScale();
								if (relativeFontSize < 10) {
									this.getOnLimitReached()();
									return;
								}
							}
							this.emit({
								class: "RichText",
								method: "edit",
								item: [this.id],
								selection: JSON.parse(
									JSON.stringify(this.editor.selection),
								),
								ops: [operation],
							});
						}
					} else {
						this.decorated.apply(operation);
						this.subject.publish(this);
					}
				}
			}
		};
		// Disable editor's native undo/redo
		editor.redo = (): void => {};
		editor.undo = (): void => {};
		const { insertData } = editor;
		editor.insertData = (data: DataTransfer): void => {
			const text = data.getData("text/plain");
			try {
				const map = JSON.parse(text);
				const isDataValid = validateItemsMap(map);
				if (!isDataValid) {
					this.insertAndEmit(insertData, data);
				}
			} catch (error) {
				this.insertAndEmit(insertData, data);
			}
		};
	}

	private insertAndEmit(
		insertData: (data: DataTransfer) => void,
		data: DataTransfer,
	): void {
		if (this.getAutosize()) {
			const relativeFontSize = this.getFontSize() / this.getMatrixScale();
			if (relativeFontSize < 10) {
				this.getOnLimitReached()();
				return;
			}
		}
		this.insertingText = true;
		insertData(data);
		this.insertingText = false;
		this.emitWithoutApplying({
			class: "RichText",
			method: "edit",
			item: [this.id],
			selection: JSON.parse(JSON.stringify(this.editor.selection)),
			ops: this.recordedInsertionOps,
		});
		this.recordedInsertionOps = [];
	}

	setId(id: string): this {
		this.id = id;
		return this;
	}

	recordMethodOps(method: SelectionMethod): void {
		this.recordedSelectionOp = {
			class: "RichText",
			method,
			item: [this.id],
			selection: JSON.parse(JSON.stringify(this.editor.selection)),
			ops: [],
		};
	}

	emitMethodOps(): void {
		const op = this.recordedSelectionOp;
		if (op && this.shouldEmit) {
			this.emitWithoutApplying(op);
		}
		this.recordedSelectionOp = undefined;
	}

	popRecordedOps(): SlateOp[] {
		const op = this.recordedSelectionOp;
		this.recordedSelectionOp = undefined;
		return op?.ops ?? [];
	}

	applyRichTextOp(op: RichTextOperation): void {
		if (operationsRichTextDebugEnabled) {
			console.info("-> EditorContainer.applyRichTextOp", op);
		}
		try {
			switch (op.method) {
				case "edit":
					this.applySelectionEdit(op);
					break;
				case "setVerticalAlignment":
					this.verticalAlignment = op.verticalAlignment;
					break;
				case "setSelectionBlockType":
				case "setSelectionFontColor":
				case "setSelectionFontFamily":
				case "setSelectionFontSize":
				case "setSelectionFontHighlight":
				case "setSelectionFontStyle":
				case "setSelectionHorizontalAlignment":
					this.applySelectionOp(op);
					break;
				case "setBlockType":
				case "setFontStyle":
				case "setFontColor":
				case "setFontFamily":
				case "setFontSize":
				case "setFontHighlight":
				case "setHorisontalAlignment":
					this.applyWholeTextOp(op);
					break;
				case "setMaxWidth":
					this.applyMaxWidth(op.maxWidth ?? 0);
					break;
			}
		} catch (error) {
			console.error(
				"Error in applying RichText Operation",
				error,
				op,
				this.editor.children,
			);
		}
	}

	addFontStyle(style: TextStyle): void {
		this.shouldEmit = false;
		const editor = this.editor;
		this.selectWholeText();

		Editor.withoutNormalizing(editor, () => {
			const marks = this.getSelectionMarks();
			if (!marks) {
				return;
			}
			const styles = marks.styles ? marks.styles.slice() : [];
			if (!styles.includes(style)) {
				styles.push(style);
				Editor.addMark(editor, "styles", styles);
			}
		});
		this.shouldEmit = true;
	}

	removeFontStyle(style: TextStyle): void {
		this.shouldEmit = false;
		const editor = this.editor;
		Editor.withoutNormalizing(editor, () => {
			this.selectWholeText();
			const marks = this.getSelectionMarks();
			if (!marks) {
				return;
			}
			const styles = marks.styles ? marks.styles.slice() : [];
			const index = styles.indexOf(style);
			if (index !== -1) {
				styles.splice(index, 1);
				Editor.addMark(editor, "styles", styles);
			}
		});
		this.shouldEmit = true;
	}

	private applySelectionEdit(op: SelectionOp): void {
		this.shouldEmit = false;
		for (const operation of op.ops) {
			this.decorated.apply(operation);
		}
		this.shouldEmit = true;
	}

	private applySelectionOp(op: SelectionOp): void {
		this.shouldEmit = false;
		// this.editor.selection = op.selection;
		Editor.withoutNormalizing(this.editor, () => {
			for (const operation of op.ops) {
				this.decorated.apply(operation);
			}
		});
		this.shouldEmit = true;
	}

	selectWholeText() {
		const start = Editor.start(this.editor, []);
		const end = Editor.end(this.editor, []);
		const range = { anchor: start, focus: end };
		Transforms.select(this.editor, range);
	}

	private applyWholeTextOp(op: WholeTextOp): void {
		const selection = this.editor.selection;
		this.selectWholeText();
		switch (op.method) {
			case "setBlockType":
				this.setSelectionBlockType(op.type);
				break;
			case "setFontStyle":
				this.setSelectionFontStyle(op.fontStyleList);
				break;
			case "setFontColor":
				this.setSelectionFontColor(op.fontColor);
				break;
			case "setFontFamily":
				this.setSelectionFontFamily(op.fontFamily);
				break;
			case "setFontSize":
				this.textScale =
					Number(op.fontSize) /
					this.getScale() /
					this.initialTextStyles.fontSize;
				break;
			case "setFontHighlight":
				this.setSelectionFontHighlight(op.fontHighlight);
				break;
			case "setHorisontalAlignment":
				this.setSelectionHorisontalAlignment(op.horisontalAlignment);
				break;
			case "setMaxWidth":
				this.applyMaxWidth(op.maxWidth ?? 0);
				break;
		}
		if (selection) {
			Transforms.select(this.editor, selection);
		}
	}

	applyMaxWidth(maxWidth: number): void {
		this.maxWidth = maxWidth;
	}

	private setSelectionBlockType(blockType: BlockType): void {
		const editor = this.editor;
		const isActive = this.isBlockActive(blockType);
		const isList = ListTypes.indexOf(blockType as ListType) !== -1;
		Transforms.unwrapNodes(editor, {
			match: node => {
				return (
					!Editor.isEditor(node) &&
					Element.isElement(node) &&
					ListTypes.indexOf(node.type as ListType) !== -1
				);
			},
			split: true,
		});
		const newProperties: Partial<Element> = {
			type: isActive ? "paragraph" : isList ? "list-item" : blockType,
		};
		Transforms.setNodes(editor, newProperties);
		if (!isActive && isList) {
			const block = { type: blockType as ListType, children: [] };
			Transforms.wrapNodes(editor, block);
		}
	}

	setMaxWidth(maxWidth: number): void {
		this.emit({
			class: "RichText",
			method: "setMaxWidth",
			item: [this.id],
			maxWidth,
		});
	}

	setSelectionFontColor(
		format: string,
		selectionContext?: string,
	): SlateOp[] {
		const editor = this.editor;
		const marks = this.getSelectionMarks();
		if (!marks) {
			return [];
		}
		this.recordMethodOps("setSelectionFontColor");
		if (marks.fontColor === format) {
			Editor.removeMark(editor, "fontColor");
		} else {
			Editor.addMark(editor, "fontColor", format);
		}

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}

		return this.popRecordedOps();
	}

	isMarkActive = (format: string) => {
		const marks = Editor.marks(this.editor);
		return marks ? marks[format] === true : false;
	};

	toggleMark = (format: string) => {
		const isActive = this.isMarkActive(format);
		if (isActive) {
			Editor.removeMark(this.editor, format);
		} else {
			Editor.addMark(this.editor, format, true);
		}
	};

	setSelectionFontStyle(style: TextStyle | TextStyle[]): SlateOp[] {
		this.recordMethodOps("setSelectionFontStyle");
		const styleList = Array.isArray(style) ? style : [style];
		for (const style of styleList) {
			const selectionStyles = this.getEachNodeInSelectionStyles();
			const isAllNodesContainStyle = selectionStyles.every(styleArr =>
				styleArr.includes(style),
			);

			const isSomeNodeContainStyle = selectionStyles.some(styleArr =>
				styleArr.includes(style),
			);

			const isAllNodesNotContainStyle = selectionStyles.every(
				styleArr => !styleArr.includes(style),
			);

			if (isAllNodesContainStyle) {
				Editor.addMark(this.editor, style, false);
			} else if (isSomeNodeContainStyle || isAllNodesNotContainStyle) {
				Editor.addMark(this.editor, style, true);
			}
		}
		return this.popRecordedOps();
	}

	setSelectionFontFamily(fontFamily: string): void {
		const editor = this.editor;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}
		const marks = this.getSelectionMarks();
		if (!marks) {
			return;
		}
		this.recordMethodOps("setSelectionFontFamily");
		if (marks.fontFamily === fontFamily) {
			Editor.removeMark(editor, "fontFamily");
		} else {
			Editor.addMark(editor, "fontFamily", fontFamily);
		}
		this.emitMethodOps();
	}

	applySelectionFontColor(fontColor: string): void {
		const editor = this.editor;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		const marks = this.getSelectionMarks();
		if (!marks) {
			return;
		}
		Editor.addMark(editor, "fontColor", fontColor);
	}

	applySelectionFontSize(fontSize: number, selectionContext?: string): void {
		const size = fontSize;
		const editor = this.editor;
		const selection = editor.selection;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		const marks = this.getSelectionMarks();
		if (!marks) {
			return;
		}

		if (
			JSON.stringify(selection?.anchor) ===
			JSON.stringify(selection?.focus)
		) {
			Transforms.select(this.editor, {
				anchor: Editor.start(this.editor, []),
				focus: Editor.end(this.editor, []),
			});
		}
		Editor.addMark(editor, "fontSize", size);

		if (selectionContext === "EditTextUnderPointer") {
			// ReactEditor.focus(editor);
		}
	}

	setSelectionFontSize(
		fontSize: number | "auto",
		selectionContext?: string,
	): SlateOp[] {
		const size = fontSize;
		const editor = this.editor;
		const selection = editor.selection;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		const marks = this.getSelectionMarks();
		if (!marks) {
			throw new Error("Editor can not get selection marks");
		}

		if (
			JSON.stringify(selection?.anchor) ===
			JSON.stringify(selection?.focus)
		) {
			Transforms.select(this.editor, {
				anchor: Editor.start(this.editor, []),
				focus: Editor.end(this.editor, []),
			});
		}
		this.recordMethodOps("setSelectionFontSize");

		// changing empty Sticker fontSize type (number->auto / auto->number) leads to undefined behaviour
		// next line doenst allow empty text to change fontSize type --- TODO fix
		if (!this.isEmpty() || (size !== "auto" && !this.getAutosize())) {
			if (size === 14 && this.getAutosize()) {
				// autoSize is based on 14 => need to disable autoSizing in decorated.apply
				Editor.addMark(editor, "fontSize", 1);
			}
			Editor.addMark(editor, "fontSize", size);
		}

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}

		return this.popRecordedOps();
	}

	setSelectionFontHighlight(
		format: string,
		selectionContext?: string,
	): SlateOp[] {
		const editor = this.editor;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}
		const marks = this.getSelectionMarks();
		if (!marks) {
			return;
		}
		this.recordMethodOps("setSelectionFontHighlight");
		if (format === "none") {
			Editor.removeMark(editor, "fontHighlight");
		} else if (marks.fontHighlight === format) {
			Editor.removeMark(editor, "fontHighlight");
		} else {
			Editor.addMark(editor, "fontHighlight", format);
		}

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}

		return this.popRecordedOps();
	}

	setSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
		selectionContext?: string,
	): SlateOp[] {
		this.recordMethodOps("setSelectionHorizontalAlignment");
		const editor = this.editor;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		const { selection } = editor;
		if (!selection) {
			throw new Error("Nothing is selected");
		}

		const [match] = Editor.nodes(editor, {
			at: Editor.unhangRange(editor, selection),
			match: node => {
				return (
					!Editor.isEditor(node) &&
					Element.isElement(node) &&
					node.horisontalAlignment === horisontalAlignment
				);
			},
		});

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}

		Transforms.setNodes(editor, {
			horisontalAlignment: horisontalAlignment,
		});
		return this.popRecordedOps();
	}

	setEditorFocus(selectionContext?: string): void {
		const editor = this.editor;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}
	}

	isBlockActive(format: BlockType): boolean {
		const editor = this.editor;
		const { selection } = editor;
		if (!selection) {
			return false;
		}
		const [match] = Editor.nodes(editor, {
			at: Editor.unhangRange(editor, selection),
			match: node => {
				return (
					!Editor.isEditor(node) &&
					Element.isElement(node) &&
					node.type === format
				);
			},
		});
		return !!match;
	}

	isFormatActive(format: TextStyle): boolean {
		const marks = Editor.marks(this.editor);
		if (!marks || !marks.styles) {
			return false;
		}
		return marks.styles.indexOf(format) !== -1;
	}

	getSelectionMarks(): Omit<TextNode, "text"> | null {
		return Editor.marks(this.editor);
	}

	getAllTextNodesInSelection(): TextNode[] {
		const { selection } = this.editor;
		if (!selection) {
			return [];
		}

		const textNodes: TextNode[] = [];
		for (const [node, path] of Editor.nodes(this.editor, {
			at: selection,
			// @ts-expect-error
			match: n => n.type === "text",
		})) {
			textNodes.push(node as TextNode);
		}

		return textNodes;
	}

	getEachNodeInSelectionStyles() {
		return this.getAllTextNodesInSelection().map(n => {
			const styles: TextStyle[] = [];
			if (n.bold) {
				styles.push("bold");
			}

			if (n.italic) {
				styles.push("italic");
			}

			if (n.underline) {
				styles.push("underline");
			}

			if (n["line-through"]) {
				styles.push("line-through");
			}
			return styles;
		});
	}

	getSelectionStyles(): string[] | undefined {
		const editor = this.editor;
		const { selection } = editor;
		if (!selection) {
			return;
		}

		const nodes = this.getAllTextNodesInSelection();
		const styles: TextStyle[][] = nodes.reduce(
			(acc: TextStyle[][], node: TextNode) => {
				const styles: TextStyle[] = [];
				if (node.bold) {
					styles.push("bold");
				}

				if (node.italic) {
					styles.push("italic");
				}

				if (node.underline) {
					styles.push("underline");
				}

				if (node["line-through"]) {
					styles.push("line-through");
				}
				acc.push(styles);
				return acc;
			},
			[],
		);

		return findCommonStrings(styles);
	}

	getSelectedBlockNode(): BlockNode | null {
		const editor = this.editor;
		const { selection } = editor;
		if (!selection) {
			return null;
		}
		const [node] = Editor.node(editor, selection);
		if (Editor.isEditor(node) || !Element.isElement(node)) {
			return null;
		}
		return node;
	}

	appendText(text: string) {
		const endPoint = Editor.end(this.editor, []);
		Transforms.select(this.editor, endPoint);
		Transforms.insertText(this.editor, text);
	}

	getText(): Descendant[] {
		return this.editor.children;
	}

	insertText(text: string): void {
		const { editor } = this;
		Transforms.insertText(editor, text);
	}

	hasTextInSelection(): boolean {
		const { selection } = this.editor;
		if (!selection || Range.isCollapsed(selection)) {
			return false;
		}

		const [start, end] = Range.edges(selection);
		const text = Editor.string(this.editor, { anchor: start, focus: end });
		return text.length > 0;
	}

	getSelection(): BaseSelection {
		return JSON.parse(JSON.stringify(this.editor.selection));
	}
}
