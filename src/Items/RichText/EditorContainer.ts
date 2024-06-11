import { validateItemsMap } from "Board/Validators";
import { Subject } from "Subject";
import {
	BaseEditor,
	Descendant,
	Editor,
	Operation as EditorOperation,
	Element,
	Transforms,
	createEditor,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import { ReactEditor, withReact } from "slate-react";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { BlockNode, BlockType, ListType, ListTypes } from "./Editor/BlockNode";
import { TextNode, TextStyle } from "./Editor/TextNode";
import { defaultTextStyle } from "./RichText";
import { operationsRichTextDebugEnabled } from "./RichTextDebugSettings";
import {
	RichTextOperation,
	SelectionMethod,
	SelectionOp,
	WholeTextOp,
} from "./RichTextOperations";

export class EditorContainer {
	readonly editor: BaseEditor & ReactEditor & HistoryEditor;

	maxWidth: number | undefined = undefined;
	textScale = 1;
	verticalAlignment: VerticalAlignment = "center";
	textLength = 0;

	private decorated = {
		realapply: (_operation: EditorOperation): void => {},

		apply: (_operation: EditorOperation): void => {},

		undo: (): void => {},

		redo: (): void => {},
	};

	private shouldEmit = true;
	private recordedSelectionOp: SelectionOp | undefined = undefined;
	readonly subject = new Subject<EditorContainer>();

	constructor(
		private id: string,
		private emit: (op: RichTextOperation) => void,
		private emitWithoutApplying: (op: RichTextOperation) => void,
		undo: () => void,
		redo: () => void,
		private getScale: () => number, // private richText: RichText, // TODO bd-695
	) {
		this.editor = withHistory(withReact(createEditor()));
		const editor = this.editor;
		/** The editor must have initial descendants */
		// horizontalAlignment for Shape - center, for RichText - left
		editor.children = [
			{
				type: "paragraph",
				horisontalAlignment: "center",
				children: [
					{
						type: "text",
						text: "",
						fontSize: 14,
					},
				],
			},
		];
		/** We save methods that we going to decorate */
		this.decorated = {
			realapply: editor.apply,
			apply: op => {
				this.decorated.realapply(op);
			},
			undo: editor.undo,
			redo: editor.redo,
		};
		/** We decorate methods */
		editor.apply = (operation: EditorOperation): void => {
			const editorHTML = document.querySelector(
				"#TextEditor > div > div > p",
			);
			this.textLength = editorHTML?.innerText.length || 0;

			if (this.shouldEmit) {
				if (this.recordedSelectionOp) {
					if (operation.type !== "set_selection") {
						this.recordedSelectionOp.ops.push(operation);
						this.decorated.apply(operation);
						this.subject.publish(this);
					}
					return;
				} else {
					if (operation.type === "set_selection") {
						this.decorated.apply(operation);
						this.subject.publish(this);
					} else {
						if (this.id !== "") {
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
					}
				}
			}
		};
		editor.redo = (): void => {
			this.shouldEmit = false;
			this.decorated.redo();
			redo();
			this.shouldEmit = true;
		};
		editor.undo = (): void => {
			this.shouldEmit = false;
			this.decorated.undo();
			undo();
			this.shouldEmit = true;
		};
		const { insertData } = editor;
		editor.insertData = (data: DataTransfer): void => {
			const text = data.getData("text/plain");
			try {
				const map = JSON.parse(text);
				const isDataValid = validateItemsMap(map);
				if (!isDataValid) {
					insertData(data);
				}
			} catch (error) {
				insertData(data);
			}
		};
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
				case "setSelectionHorisontalAlignment":
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
					this.applyMaxWidth(op.maxWidth);
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

	private applySelectionEdit(op: SelectionOp): void {
		this.shouldEmit = false;
		/* TODO bd-695
        if (this.richText.getAutosize()
            && (op.ops[0].type === "insert_text"
            || op.ops[0].type === "split_node")
        ) {
            console.log("text len", this.textLength);
            console.log("w", this.richText.getWidth());
            if (this.richText.getFontSize() > 14) { // 14 - defaultSize
                console.log("BEFORE", this.richText.getFontSize());
                if (op.ops[0].type === "split_node"
                || op.ops[0].text.length === 1) {
                    this.decorated.apply(op.ops[0]);
                    setTimeout(() => {
                        if (this.richText.getFontSize() < 14) {
                            console.log("overflowed");
                            // Clear all / remove last one
                            const removeOp = {
                                type: "remove_text",
                                path: op.ops[0].path,
                                offset: op.ops[0].offset + op.ops[0].text.length - 1,
                                text: op.ops[0].text.slice(-1)
                            };
                            this.richText.clearText();
                            this.decorated.apply(removeOp);
                        }
                    }, 5);
                } else {
                    op.ops[0].text.split("").forEach((letter, index) => {
                        const newOp = {
                            ...op,
                            ops: [{
                                ...op.ops[0],
                                text: letter,
                                offset: op.ops[0].offset + index
                            }]
                        };
                        this.applySelectionEdit(newOp);
                    })
                }
            }
        } else {
            this.decorated.apply(op.ops[0]);
        }
        */
		this.decorated.apply(op.ops[0]);
		this.shouldEmit = true;
	}

	private applySelectionOp(op: SelectionOp): void {
		this.shouldEmit = false;
		this.editor.selection = op.selection;
		Editor.withoutNormalizing(this.editor, () => {
			for (const operation of op.ops) {
				this.decorated.apply(operation);
			}
		});
		this.shouldEmit = true;
	}

	private applyWholeTextOp(op: WholeTextOp): void {
		const selection = this.editor.selection;
		Transforms.select(this.editor, {
			anchor: Editor.start(this.editor, []),
			focus: Editor.end(this.editor, []),
		});
		this.shouldEmit = false;
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
					op.fontSize / this.getScale() / defaultTextStyle.fontSize;
				break;
			case "setFontHighlight":
				this.setSelectionFontHighlight(op.fontHighlight);
				break;
			case "setHorisontalAlignment":
				this.setSelectionHorisontalAlignment(op.horisontalAlignment);
				break;
			case "setMaxWidth":
				this.maxWidth = op.maxWidth;
				break;
		}
		if (selection) {
			Transforms.select(this.editor, selection);
		}
		this.shouldEmit = true;
	}

	private applyMaxWidth(maxWidth: number): void {
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

	setSelectionFontColor(format: string): void {
		const editor = this.editor;
		const marks = this.getSelectionMarks();
		if (!marks) {
			return;
		}
		this.recordMethodOps("setSelectionFontColor");
		if (marks.fontColor === format) {
			Editor.removeMark(editor, "fontColor");
		} else {
			Editor.addMark(editor, "fontColor", format);
		}
		this.emitMethodOps();
	}

	setSelectionFontStyle(style: TextStyle | TextStyle[]): void {
		const editor = this.editor;
		const styleList = Array.isArray(style) ? style : [style];
		const marks = this.getSelectionMarks();
		if (!marks) {
			return;
		}
		this.recordMethodOps("setSelectionFontStyle");
		styleList.forEach(style => {
			const styles = marks.styles ? marks.styles.slice() : [];
			const index = styles.indexOf(style);
			if (index === -1) {
				styles.push(style);
			} else {
				styles.splice(index, 1);
			}
			Editor.removeMark(editor, "styles");
			Editor.addMark(editor, "styles", styles);
			ReactEditor.focus(editor);
		});
		this.emitMethodOps();
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

	setSelectionFontSize(fontSize: number): void {
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
		this.recordMethodOps("setSelectionFontSize");
		Editor.addMark(editor, "fontSize", size);
		this.emitMethodOps();
	}

	setSelectionFontHighlight(format: string): void {
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
		this.emitMethodOps();
	}

	setSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
	): void {
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

		Transforms.setNodes(editor, {
			horisontalAlignment: horisontalAlignment,
		});
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
}
