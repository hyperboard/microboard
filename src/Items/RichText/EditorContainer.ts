import { getParagraphWithPassedTextNode } from "Board/Items/RichText/getParagraph";
import { setNodeStyles } from "Board/Items/RichText/setNodeStyles";
import { conf } from "Board/Settings";
import markdown from "remark-parse";
import slate from "remark-slate";
import { Subject } from "shared/Subject";
import {
	BaseEditor,
	BaseRange,
	BaseSelection,
	createEditor,
	Descendant,
	Editor,
	Element,
	Location,
	Node,
	Range,
	Operation as SlateOp,
	Transforms,
	Path,
	Operation,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import { ReactEditor, withReact } from "slate-react";
import { unified } from "unified";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import {
	BlockNode,
	BlockType,
	ListType,
	ListTypes,
	ParagraphNode,
} from "./Editor/BlockNode";
import { TextNode, TextStyle } from "./Editor/TextNode";
import { isTextEmpty } from "./isTextEmpty";
import { DEFAULT_TEXT_STYLES, DefaultTextStyles } from "./RichText";
import {
	RichTextOperation,
	SelectionMethod,
	SelectionOp,
	WholeTextOp,
} from "./RichTextOperations";
import { findCommonStrings } from "./utils";
import path from "path";
import { isCursorAtStartOfFirstChild } from "./isCursorAtStartOfFirstChild";
import { handleListMerge } from "./handleListMerge";
import { getAreAllChildrenEmpty } from "./getAreAllChildrenEmpty";

const { i18n } = conf;

// import { getSlateFragmentAttribute } from "slate-react/dist/utils/dom";

export class EditorContainer {
	readonly editor: BaseEditor & ReactEditor & HistoryEditor;

	maxWidth: number | undefined = undefined;
	textScale = 1;
	verticalAlignment: VerticalAlignment = "center";
	textLength = 0;
	private chunksQueue: string[] = [];
	private isProcessingChunk = false;
	private stopProcessingMarkDownCb: (() => void) | null = null;
	private currentNode = "";

	private decorated = {
		realapply: (_operation: SlateOp): void => {},

		apply: (_operation: SlateOp): void => {},

		undo: (): void => {},

		redo: (): void => {},
	};

	shouldEmit = true;
	private recordedOps: SlateOp[] | null = null;
	readonly subject = new Subject<EditorContainer>();
	isCommandApplication = false;

	constructor(
		private id: string,
		private emit: (op: RichTextOperation) => void,
		private emitWithoutApplying: (op: RichTextOperation) => void,
		undo: () => void,
		redo: () => void,
		private getScale: () => number,
		public horisontalAlignment: HorisontalAlignment,
		private initialTextStyles: DefaultTextStyles,
		fontSize: number,
		private getAutosize: () => boolean,
		private autosizeEnable: () => void,
		private autosizeDisable: () => void,
		private getFontSize: () => number,
		private getMatrixScale: () => number,
		private getOnLimitReached: () => () => void,
		private calcAutoSize: (textNodes?: BlockNode[]) => number,
		private applyAutoSizeScale: (
			textScale: number,
			blockNodes?: BlockNode[],
		) => void,
		private updateElement: () => void,
	) {
		const baseEditor = createEditor();
		this.editor = withHistory(withReact(baseEditor));
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
						...{ ...initialTextStyles, fontSize },
						overline: false,
						"line-through": false,
						subscript: false,
						superscript: false,
					},
				],
			},
		];
		const onChange = this.editor.onChange;
		this.editor.onChange = () => {
			this.updateElement();
			onChange();
		};
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
				// this.subject.publish(this);
			},
			undo: editor.undo,
			redo: editor.redo,
		};
		/** We decorate methods */
		editor.apply = (operation: SlateOp): void => {
			if (!this.shouldEmit) {
				return;
			}
			const isRecordingOperations = this.recordedOps !== null;
			if (isRecordingOperations) {
				const isSettingNodeFontSize =
					operation.type === "set_node" &&
					"fontSize" in operation.newProperties &&
					"fontSize" in operation.properties;
				if (isSettingNodeFontSize) {
					const isSettingNodeFontSizeToAuto =
						operation.newProperties.fontSize === "auto";
					if (isSettingNodeFontSizeToAuto) {
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
				this.recordedOps?.push(operation);
				this.decorated.apply(operation);
			} else {
				if (operation.type === "set_selection") {
					this.decorated.apply(operation);
					this.subject.publish(this);
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

					if (!this.isCommandApplication) {
						if (this.recordedOps && this.recordedOps.length !== 0) {
							this.recordedOps.push(operation);
						} else {
							this.startOpRecording(operation);
							setTimeout(() => {
								const ops = this.stopOpRecordingAndGetOps();
								if (ops.length === 0) {
									return;
								}
								this.emitWithoutApplying({
									class: "RichText",
									method: "edit",
									item: [this.id],
									selection: JSON.parse(
										JSON.stringify(this.editor.selection),
									),
									ops,
								});
							});
						}
					}

					this.decorated.apply(operation);
				}
			}
		};
		// Disable editor's native undo/redo
		editor.redo = (): void => {};
		editor.undo = (): void => {};
	}

	setId(id: string): this {
		this.id = id;
		return this;
	}

	startOpRecording(op?: SlateOp): void {
		this.recordedOps = op ? [op] : [];
	}

	getTextFromNode(node: BlockNode): string {
		if ("text" in node) {
			return node.text || "";
		}

		if ("children" in node && Array.isArray(node.children)) {
			return node.children.reduce((acc: string, child: any) => {
				return acc + this.getTextFromNode(child);
			}, "");
		}

		return "";
	}

	getEndNodePath(
		node: BlockNode,
		nodePath: number[],
	): { path: number[]; offset: number } | null {
		if ("text" in node) {
			return { path: nodePath, offset: node.text.length };
		}
		if ("children" in node && Array.isArray(node.children)) {
			const childIndex = node.children.length - 1;
			return this.getEndNodePath(node.children[childIndex], [
				...nodePath,
				childIndex,
			]);
		}
		return null;
	}

	getSelectionOp(method: SelectionMethod, ops: SlateOp[]): SelectionOp {
		return {
			class: "RichText",
			method,
			item: [this.id],
			selection: this.getSelection(),
			ops,
		};
	}

	moveSelectionToTheEndOfNodeByOps(opsArr: Operation[]) {
		if (
			opsArr.length &&
			opsArr[0].type === "insert_node" &&
			opsArr.length === 1
		) {
			const op = opsArr[0];
			const path = this.getEndNodePath(op.node, op.path);
			if (path) {
				Transforms.select(this.editor, {
					anchor: path,
					focus: path,
				});
			}
		}
	}

	stopOpRecordingAndGetOps(): SlateOp[] {
		const op = this.recordedOps;
		this.recordedOps = null;

		const opsArr = op?.ops ?? op ?? [];

		this.moveSelectionToTheEndOfNodeByOps(opsArr);

		return opsArr;
	}

	applyRichTextOp(op: RichTextOperation): void {
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
					this.applyRichTextOp(op);
					break;
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
				"Error in applying RichText Operation in Item: ",
				this.id,
				error,
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

	selectWholeText(): void {
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
		this.startOpRecording();
		if (marks.fontColor !== format) {
			Editor.addMark(editor, "fontColor", format);
		}

		if (selectionContext === "EditTextUnderPointer") {
			try {
				ReactEditor.focus(editor);
			} catch (er) {
				console.warn(er);
			}
		}

		return this.stopOpRecordingAndGetOps();
	}

	setSelectionLink(link: string | undefined, selection: BaseSelection) {
		const editor = this.editor;

		if (!selection) {
			this.selectWholeText();
		} else {
			Transforms.select(editor, selection);
		}

		const format = link
			? "rgba(71, 120, 245, 1)"
			: DEFAULT_TEXT_STYLES.fontColor;

		if (!editor.selection) {
			return;
		}

		this.startOpRecording();
		Editor.addMark(editor, "fontColor", format);

		for (const [node, path] of Editor.nodes(editor, {
			match: n => n.type === "text",
		})) {
			const nodeRange = Editor.range(editor, path);
			Transforms.select(editor, nodeRange);
			Transforms.setNodes(
				editor,
				{ link },
				{ split: false, match: n => n.type === "text" },
			);
		}

		return this.stopOpRecordingAndGetOps();
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
		this.startOpRecording();
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

		return this.stopOpRecordingAndGetOps();
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
		this.startOpRecording();

		// changing empty Sticker fontSize type (number->auto / auto->number) leads to undefined behaviour
		// next line doenst allow empty text to change fontSize type --- TODO fix
		if (!this.isEmpty() || (size !== "auto" && !this.getAutosize())) {
			if (size === 14 && this.getAutosize()) {
				// autoSize is based on 14 => need to disable autoSizing in decorated.apply
				Editor.addMark(editor, "fontSize", 1);
			}
			if (this.isEmpty()) {
				const firstTextNode = this.getAllTextNodesInSelection()[0];
				if (firstTextNode) {
					const placeholderNode = structuredClone(firstTextNode);
					placeholderNode.fontSize = fontSize;
					const paragraph =
						getParagraphWithPassedTextNode(placeholderNode);
					this.insertCopiedNodes(paragraph);
					this.updateElement();
				}
			} else {
				Editor.addMark(editor, "fontSize", size);
			}
		}

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}

		return this.stopOpRecordingAndGetOps();
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
			return [];
		}
		this.startOpRecording();
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

		return this.stopOpRecordingAndGetOps();
	}

	setSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
		selectionContext?: string,
	): SlateOp[] {
		this.startOpRecording();
		const editor = this.editor;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		const { selection } = editor;
		if (!selection) {
			throw new Error("Nothing is selected");
		}

		// const [match] = Editor.nodes(editor, {
		// 	at: Editor.unhangRange(editor, selection),
		// 	match: node => {
		// 		return (
		// 			!Editor.isEditor(node) &&
		// 			Element.isElement(node) &&
		// 			node.horisontalAlignment === horisontalAlignment
		// 		);
		// 	},
		// });

		if (selectionContext === "EditTextUnderPointer") {
			ReactEditor.focus(editor);
		}

		Transforms.setNodes(editor, {
			horisontalAlignment: horisontalAlignment,
		});
		return this.stopOpRecordingAndGetOps();
	}

	setPaddingTop(paddingTop: number) {
		const editor = this.editor;
		Transforms.setNodes(editor, {
			paddingTop,
		});
	}

	setPaddingBottom(paddingBottom: number) {
		const editor = this.editor;
		Transforms.setNodes(editor, {
			paddingBottom,
		});
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

	getAllNodesInSelection(): BlockNode[] {
		const { selection } = this.editor;
		if (!selection) {
			return [];
		}

		const nodes: BlockNode[] = [];
		for (const [node, path] of Editor.nodes(this.editor, {
			at: selection,
		})) {
			nodes.push(node);
		}

		return nodes;
	}

	getCursorPath() {
		if (!this.editor.selection) {
			return null;
		}

		return this.editor.selection.anchor.path;

		// return editor.selection.focus.path;
	}

	handleListMerge(): boolean {
		handleListMerge(this.editor);
	}

	getListTypeAtSelectionStart(): ListType | null {
		const { selection } = this.editor;

		if (!selection) {
			this.selectWholeText();
		}

		if (!selection) {
			return null;
		}

		const startPoint = Range.start(selection);

		const listEntry = Editor.above<Element>(this.editor, {
			at: startPoint,
			match: n => n.type === "ol_list" || n.type === "ul_list",
		});

		if (listEntry) {
			const [listNode] = listEntry;
			return listNode.type as ListType;
		}

		return null;
	}

	handleSplitListItem(): boolean {
		const editor = this.editor;
		if (!editor.selection || !Range.isCollapsed(editor.selection)) {
			return false;
		}

		const { anchor } = editor.selection;

		const textNodeEntry = Editor.node(editor, anchor.path);
		if (!textNodeEntry) {
			return false;
		}
		const [textNode, textNodePath] = textNodeEntry;
		if (
			!Node.isNode(textNode) ||
			Editor.isEditor(textNode) ||
			!("text" in textNode)
		) {
			return false;
		}

		const paragraphPath = Path.parent(textNodePath);
		const paragraphEntry = Editor.node(editor, paragraphPath);
		if (!paragraphEntry) {
			return false;
		}
		const [paragraphNode] = paragraphEntry;
		if (
			!Element.isElement(paragraphNode) ||
			!Editor.isBlock(editor, paragraphNode)
		) {
			return false;
		}

		const listItemPath = Path.parent(paragraphPath);
		const listItemEntry = Editor.node(editor, listItemPath);
		if (!listItemEntry) {
			return false;
		}
		const [listItemNode] = listItemEntry;
		if (
			!Element.isElement(listItemNode) ||
			listItemNode.type !== "list_item"
		) {
			return false;
		}

		const listPath = Path.parent(listItemPath);
		const listEntry = Editor.node(editor, listPath);
		if (!listEntry) {
			return false;
		}
		const [listNode] = listEntry;
		if (
			!Element.isElement(listNode) ||
			(listNode.type !== "ol_list" && listNode.type !== "ul_list")
		) {
			return false;
		}

		const isBlockEmpty = textNode.text === "";
		const isOnlyChildParagraph = listItemNode.children.length === 1;

		if (isBlockEmpty && isOnlyChildParagraph) {
			const listItemIndex = listItemPath[listItemPath.length - 1];
			const [parentList, parentListPath] = Editor.parent(
				editor,
				listItemPath,
			);
			const listType = parentList.type;

			Editor.withoutNormalizing(editor, () => {
				const nextPath = Path.next(parentListPath);
				Transforms.insertNodes(
					editor,
					{
						...this.createParagraphNode(""),
						paddingTop: 0.5,
					},
					{ at: nextPath },
				);

				if (parentList.children.length > listItemIndex + 1) {
					const newListPath = Path.next(nextPath);
					const itemsAfter = parentList.children.slice(
						listItemIndex + 1,
					) as Descendant[];

					Transforms.insertNodes(
						editor,
						{
							type: listType,
							children: itemsAfter.map(item => ({
								type: "list_item",
								children: item.children,
							})),
						},
						{ at: newListPath },
					);
				}

				Transforms.removeNodes(editor, {
					at: parentListPath,
					match: (n, path) => path[path.length - 1] >= listItemIndex,
				});

				const [updatedParentList] = Editor.node(editor, parentListPath);
				if (getAreAllChildrenEmpty(updatedParentList)) {
					Transforms.removeNodes(editor, { at: parentListPath });
				}

				Transforms.select(editor, {
					anchor: { path: [...nextPath, 0], offset: 0 },
					focus: { path: [...nextPath, 0], offset: 0 },
				});
			});

			return true;
		}

		Transforms.splitNodes(editor, {
			at: editor.selection.anchor,
			match: n => Element.isElement(n) && n.type === "list_item",
			always: true,
		});

		const nextListItemPath = Path.next(listItemPath);
		const newParagraphPath = [...nextListItemPath, 0];
		const [newNode] = Editor.node(editor, newParagraphPath);
		if (Element.isElement(newNode)) {
			Transforms.setNodes(
				editor,
				{ paddingTop: 0.5 },
				{ at: newParagraphPath },
			);
		}

		return true;
	}

	toggleListTypeForSelection(targetListType: ListType) {
		const { editor } = this;
		const { selection } = editor;

		if (!selection) {
			return false;
		}

		Editor.withoutNormalizing(editor, () => {
			const [start, end] = Range.edges(selection);
			const commonAncestorPath = Path.common(start.path, end.path);

			const nodes = Array.from(
				Editor.nodes(editor, {
					at: selection,
					mode: "lowest",
					match: n => Editor.isBlock(editor, n),
				}),
			);

			const nodesWithLists: Record<
				number,
				[node: BlockNode, path: number[]][]
			> = {};

			nodes.forEach(([node, path]) => {
				const parentList = this.getBlockParentList(path);
				if (parentList) {
					if (!nodesWithLists[parentList[1].length]) {
						nodesWithLists[parentList[1].length] = [parentList];
					} else if (
						!nodesWithLists[parentList[1].length].some(
							nodeEntry => nodeEntry[0] === parentList[0],
						)
					) {
						if (nodesWithLists[parentList[1].length]) {
							nodesWithLists[parentList[1].length].push(
								parentList,
							);
						}
					}
				} else {
					if (nodesWithLists[path.length]) {
						nodesWithLists[path.length].push([node, path]);
					} else {
						nodesWithLists[path.length] = [[node, path]];
					}
				}
			});

			const [level, nodesArr] = Object.entries(nodesWithLists)[0];

			if (nodesArr.length === 0) {
				return false;
			}

			const nodePaths = nodesArr.map(([_, path]) => path);

			const newSelectionStart: Path = nodesArr[0][1];
			const newSelectionEnd: Path = [...nodesArr[nodesArr.length - 1][1]];
			let diff = 0;

			for (const [node, path] of nodesArr) {
				if (Element.isElement(node)) {
					if (node.type === "ol_list" || node.type === "ul_list") {
						const childrenCount = node.children.length;
						newSelectionEnd[newSelectionEnd.length - 1] =
							newSelectionEnd[newSelectionEnd.length - 1] +
							childrenCount -
							1;
						path[path.length - 1] = path[path.length - 1] + diff;
						console.log(this.getText());
						Transforms.unwrapNodes(editor, {
							at: path,
							mode: "highest",
							match: n =>
								Element.isElement(n) && n.type === "list_item",
							split: true,
						});

						Transforms.unwrapNodes(editor, {
							at: path,
							mode: "highest",
							match: n =>
								Element.isElement(n) &&
								(n.type === "ol_list" || n.type === "ul_list"),
							split: true,
						});
						diff = diff + childrenCount - 1;
					} else if (node.type === "list_item") {
						Transforms.unwrapNodes(editor, {
							at: path,
							match: n =>
								Element.isElement(n) && n.type === "list_item",
							split: true,
						});
					}
				}
			}

			const refreshedNodes = Array.from(
				Editor.nodes(editor, {
					at: Editor.range(
						editor,
						newSelectionStart,
						newSelectionEnd,
					),
					mode: "all",
					match: n => Element.isElement(n),
				}),
			).filter(([_, path]) => path.length === Number(level));

			const refreshedPaths = refreshedNodes.map(([_, path]) => path);

			for (const path of refreshedPaths) {
				Transforms.wrapNodes(
					editor,
					{ type: "list_item", children: [] },
					{ at: path },
				);
			}

			const listRange = Editor.range(
				editor,
				refreshedPaths[0],
				refreshedPaths[refreshedPaths.length - 1],
			);
			Transforms.wrapNodes(
				editor,
				{ type: targetListType, listLevel: 1, children: [] },
				{ at: listRange },
			);
		});
		this.subject.publish(this);
		return true;
	}

	includesListNode(): boolean {
		return this.getText().some(
			node => node.type === "ol_list" || node.type === "ul_list",
		);
	}

	toggleListType(targetListType: ListType, shouldWrap = true): boolean {
		const { editor } = this;
		const { selection } = editor;

		if (!selection) {
			return false;
		}

		if (!Range.isCollapsed(selection)) {
			return this.toggleListTypeForSelection(targetListType);
		}

		Editor.withoutNormalizing(editor, () => {
			const { anchor } = selection;
			const [textNode, textNodePath] = Editor.node(editor, anchor.path);
			if (
				!textNode ||
				textNode.type !== "text" ||
				typeof textNode.text !== "string"
			) {
				return false;
			}

			const paragraphPath = Path.parent(textNodePath);
			const [paragraph] = Editor.node(editor, paragraphPath);
			if (!paragraph) {
				return false;
			}

			const listItemPath = Path.parent(paragraphPath);
			const [listItem] = Editor.node(editor, listItemPath);
			if (!listItem || listItem.type !== "list_item") {
				if (shouldWrap) {
					this.wrapIntoList(targetListType, selection);
					this.subject.publish(this);
				}
				return false;
			}

			const listPath = Path.parent(listItemPath);
			const [list] = Editor.node(editor, listPath);
			if (!list || (list.type !== "ol_list" && list.type !== "ul_list")) {
				if (shouldWrap) {
					this.wrapIntoList(targetListType, selection);
					this.subject.publish(this);
				}
				return false;
			}

			if (list.type === targetListType) {
				Transforms.unwrapNodes(editor, {
					at: listPath,
					match: n => Element.isElement(n) && n.type === "list_item",
					split: true,
				});

				Transforms.unwrapNodes(editor, {
					at: listPath,
					match: n =>
						Element.isElement(n) &&
						(n.type === "ol_list" || n.type === "ul_list"),
					split: true,
				});
			} else if (shouldWrap) {
				Transforms.setNodes(
					editor,
					{
						type: targetListType,
						listLevel: list.listLevel || 1,
					},
					{ at: listPath },
				);
			}
			return true;
		});

		this.subject.publish(this);
		return true;
	}

	wrapIntoList(targetListType: ListType, location: Location) {
		const editor = this.editor;

		Transforms.wrapNodes(
			editor,
			{ type: targetListType, listLevel: 1, children: [] },
			{ at: location },
		);
		Transforms.wrapNodes(
			editor,
			{ type: "list_item", children: [] },
			{ at: location },
		);
	}

	withAutoList(): boolean {
		const editor = this.editor;
		const { selection } = editor;
		if (!selection) {
			return false;
		}

		const nodes = this.getText();

		if (
			nodes.length !== 1 ||
			nodes[0].type !== "paragraph" ||
			nodes[0].children.length !== 1
		) {
			return false;
		}

		if (nodes[0].children[0].text !== "1.") {
			return false;
		}

		Transforms.wrapNodes(
			editor,
			{ type: "ol_list", listLevel: 1, children: [] },
			{ at: selection },
		);
		Transforms.wrapNodes(
			editor,
			{ type: "list_item", children: [] },
			{ at: selection },
		);

		this.clearAllTextNodes();

		return true;
	}

	clearAllTextNodes() {
		const editor = this.editor;
		for (const [node, path] of Editor.nodes(editor, {
			match: n => n.type === "text",
		})) {
			Transforms.removeNodes(editor, { at: path });
			Transforms.setNodes(editor, { ...node, text: "" }, { at: path });
		}
	}

	getBlockParentList(
		blockPath: number[],
	): [node: BlockNode, path: number[]] | null {
		const editor = this.editor;
		const listItemPath = Path.parent(blockPath);
		const [listItem] = Editor.node(editor, listItemPath);
		if (!listItem || listItem.type !== "list_item") {
			return null;
		}

		const listPath = Path.parent(listItemPath);
		const [list] = Editor.node(editor, listPath);
		if (!list || (list.type !== "ol_list" && list.type !== "ul_list")) {
			return null;
		}

		return [list, listPath];
	}

	handleWrapIntoNestedList(): boolean {
		const editor = this.editor;
		const { selection } = editor;

		if (!selection) {
			return false;
		}

		const { anchor } = selection;
		const [textNode, textNodePath] = Editor.node(editor, anchor.path);
		if (
			!textNode ||
			textNode.type !== "text" ||
			typeof textNode.text !== "string" ||
			!isCursorAtStartOfFirstChild(this.editor, textNodePath)
		) {
			return false;
		}

		const paragraphPath = Path.parent(textNodePath);
		const [paragraph] = Editor.node(editor, paragraphPath);
		if (
			!paragraph ||
			!isCursorAtStartOfFirstChild(this.editor, paragraphPath)
		) {
			return false;
		}

		const listItemPath = Path.parent(paragraphPath);
		const [listItem] = Editor.node(editor, listItemPath);
		if (!listItem || listItem.type !== "list_item") {
			return false;
		}

		const listPath = Path.parent(listItemPath);
		const [list] = Editor.node(editor, listPath);
		if (!list || (list.type !== "ol_list" && list.type !== "ul_list")) {
			return false;
		}

		Transforms.wrapNodes(
			editor,
			{ type: "list_item", children: [] },
			{ at: paragraphPath },
		);

		Transforms.wrapNodes(
			editor,
			{
				type: list.type,
				listLevel: (list.listLevel || 1) + 1,
				children: [],
			},
			{ at: paragraphPath },
		);

		this.subject.publish(this);
		return true;
	}

	getFirstSelectionLink(selection: BaseSelection): string | undefined {
		if (!selection) {
			return undefined;
		}

		for (const [node, path] of Editor.nodes(this.editor, {
			at: selection,
			// @ts-expect-error
			match: n => !!n.link,
		})) {
			return node.link;
		}

		return undefined;
	}

	getEachNodeInSelectionStyles(): string[][] {
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
				if (node.text === "") {
					return acc;
				}

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

	applyHyperlink(url: string, selection: BaseSelection): void {
		const { editor } = this;
		if (!editor) {
			throw new Error("Editor is not initialized");
		}

		Transforms.wrapNodes(
			editor,
			{ type: "link", url },
			{ at: selection, split: true },
		);

		Transforms.setNodes(
			editor,
			{ style: { color: "purple", textDecoration: "underline" } },
			{ at: selection },
		);

		// ReactEditor.focus(editor);
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
		if (this.getAutosize()) {
			const relativeFontSize = this.getFontSize() / this.getMatrixScale();
			if (relativeFontSize < 10) {
				this.getOnLimitReached()();
				return;
			}
		}
		this.startOpRecording();
		this.insertCopiedText(text);
		this.emitWithoutApplying(
			this.getSelectionOp("edit", this.stopOpRecordingAndGetOps()),
		);
	}

	getTextParagraphs(lines: string[]): ParagraphNode[] {
		const newlines: ParagraphNode[] = [];

		lines.forEach(line => {
			if (!this.getAutosize()) {
				newlines.push(this.createParagraphNode(line));
				return;
			}

			const validText = this.getValidText(line, newlines);
			if (validText.length > 0) {
				newlines.push(this.createParagraphNode(validText));
			} else {
				this.getOnLimitReached()();
			}
		});

		return newlines;
	}

	private getValidText(line: string, newlines: ParagraphNode[]): string {
		let left = 0;
		let right = line.length;
		let validText = "";

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const currentText = line.slice(0, mid);

			const testLine = this.createParagraphNode(currentText);
			const nodes = [...newlines, testLine];
			this.applyAutoSizeScale(this.calcAutoSize(nodes), nodes);
			const relativeFontSize = this.getFontSize() / this.getMatrixScale();

			if (relativeFontSize >= 10) {
				validText = currentText;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}

		return validText;
	}

	private createParagraphNode(text: string): ParagraphNode {
		return {
			type: "paragraph",
			children: [{ type: "text", text, ...Editor.marks(this.editor) }],
			horisontalAlignment: this.horisontalAlignment,
		};
	}

	insertCopiedText(text: string): boolean {
		const lines = this.getTextParagraphs(text.split(/\r\n|\r|\n/));
		const isPrevTextEmpty = this.isEmpty();
		if (this.getAutosize()) {
			if (this.getAutosize()) {
				if (!this.checkIsAutoSizeTextScaleAllowed(lines)) {
					this.getOnLimitReached()();
					return true;
				}
			}
		}
		let insertLocation: Location | undefined = undefined;

		if (isPrevTextEmpty) {
			const text = lines[0].children[0].text;
			insertLocation = { path: [0, 0], offset: text.length };
			this.editor.insertText(text);
		}

		Transforms.insertNodes(
			this.editor,
			lines.slice(isPrevTextEmpty ? 1 : 0),
			{
				at: insertLocation,
			},
		);
		this.subject.publish(this);

		return true;
	}

	checkIsAutoSizeTextScaleAllowed(nodes: BlockNode[]): boolean {
		const existingNodes = this.getBlockNodes();
		const textScale = this.calcAutoSize([...existingNodes, ...nodes]);
		const marks = this.getSelectionMarks();
		const fontSize = marks?.fontSize ?? this.initialTextStyles.fontSize;
		return (
			Math.ceil(textScale * (fontSize === "auto" ? 14 : fontSize)) /
				this.getMatrixScale() >
			4
		);
	}

	insertCopiedNodes(nodes: BlockNode[]): boolean {
		const isPrevTextEmpty = this.isEmpty();
		const editor = this.editor;

		if (this.getAutosize()) {
			if (!this.checkIsAutoSizeTextScaleAllowed(nodes)) {
				this.getOnLimitReached()();
				return true;
			}
		}

		if (isPrevTextEmpty) {
			this.selectWholeText();
			Transforms.removeNodes(editor);
			Transforms.insertNodes(editor, nodes);
			this.moveCursorToEndOfTheText();
			this.subject.publish(this);
			return true;
		}

		if (
			nodes.length === 1 &&
			nodes[0].type === "paragraph" &&
			nodes[0].children.length === 1 &&
			nodes[0].children[0].type === "text"
		) {
			Transforms.insertText(editor, nodes[0].children[0].text);
			Transforms.collapse(this.editor, { edge: "end" });
			this.subject.publish(this);
			return true;
		}

		Transforms.insertNodes(editor, nodes);
		Transforms.collapse(this.editor, { edge: "end" });

		this.subject.publish(this);
		return true;
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
			Transforms.insertNodes(this.editor, this.createParagraphNode(""), {
				at: [0],
			});
			this.subject.publish(this);
			return true;
		}

		if (text.startsWith(i18n.t("AIInput.generatingResponse"))) {
			return true;
		}

		const isPrevTextEmpty = this.isEmpty();

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
					(item: BlockNode, index) => {
						setNodeStyles({
							node: item,
							editor: this.editor,
							horisontalAlignment: this.horisontalAlignment,
							isPaddingTopNeeded: item.type !== "code_block",
						});
						return item;
					},
				);
				if (isNewParagraphNeeded) {
					nodes.push(this.createParagraphNode(""));
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
				this.selectWholeText();
				this.stopProcessingMarkDownCb();
				this.stopProcessingMarkDownCb = null;
			}
			return;
		}

		const prevText =
			this.getText()?.[this.getText().length - 1]?.children[0]?.text;
		if (prevText?.startsWith(i18n.t("AIInput.generatingResponse"))) {
			this.clearText();
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
		const isPrevTextEmpty = this.isEmpty();

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

	insertData = (data: DataTransfer) => {
		if (!this.editor.insertFragmentData(data)) {
			this.editor.insertTextData(data);
		}
	};

	insertFragmentData = (data: DataTransfer): boolean => {
		/**
		 * Checking copied fragment from application/x-slate-fragment or data-slate-fragment
		 */
		const fragment = data.getData("application/x-slate-fragment");
		// || getSlateFragmentAttribute(data);

		if (fragment) {
			// const decoded = decodeURIComponent(
			// 	Buffer.from(fragment, "base64").toString("utf-8"),
			// );
			// Window Smell window
			const decoded = decodeURIComponent(window.atob(fragment));
			const parsed = JSON.parse(decoded) as Node[];
			this.editor.insertFragment(parsed);
			return true;
		}
		return false;
	};

	insertTextData = (data: DataTransfer): boolean => {
		const text = data.getData("text/plain");

		if (text) {
			return this.insertCopiedText(text);
		}
		return false;
	};

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

	splitNode(): void {
		Transforms.splitNodes(this.editor, { always: true });
	}

	getBlockNodes(): BlockNode[] {
		return this.editor.children as BlockNode[];
	}

	isEmpty(): boolean {
		return isTextEmpty(this.editor.children);
	}

	clearText(): void {
		Transforms.select(this.editor, {
			anchor: Editor.start(this.editor, []),
			focus: Editor.end(this.editor, []),
		});
		this.selectWholeText();
		Transforms.delete(this.editor);
	}

	addText(text: string): void {
		this.editor.apply({
			type: "insert_text",
			text: text,
			path: [0, 0],
			offset: 0,
		});
	}

	moveCursorToEndOfTheText(delay = 10): Promise<void> {
		const moveCursorToTheEndOfTheText = (): void => {
			this.selectWholeText();
			Transforms.collapse(this.editor, { edge: "end" });
		};

		return new Promise<void>(resolve => {
			if (delay === 0) {
				moveCursorToTheEndOfTheText();
				resolve();
			} else {
				setTimeout(() => {
					moveCursorToTheEndOfTheText();
					resolve();
				}, delay);
			}
		});
	}
}
