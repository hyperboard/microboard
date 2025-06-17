import { conf, DefaultTextStyles } from "Settings";
import { Subject } from "Subject";
import {
  BaseEditor,
  BaseSelection,
  createEditor,
  Descendant,
  Editor,
  Operation as SlateOp,
  Transforms,
  Operation,
} from "slate";
import { HistoryEditor, withHistory } from "slate-history";
import { ReactEditor, withReact } from "slate-react";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { BlockNode, ListType, ParagraphNode } from "./Editor/BlockNode";
import { TextNode, TextStyle } from "./Editor/TextNode";
import { isTextEmpty } from "./editorHelpers/common/isTextEmpty";
import {
  RichTextOperation,
  SelectionOp,
  WholeTextOp,
} from "./RichTextOperations";
import { handleListMerge } from "./editorHelpers/lists/handleListMerge";
import { handleSplitListItem } from "Items/RichText/editorHelpers/lists/handleSplitListItem";
import { createParagraphNode } from "Items/RichText/editorHelpers/common/createParagraphNode";
import { withAutoList } from "Items/RichText/editorHelpers/lists/withAutoList";
import { handleWrapIntoNestedList } from "Items/RichText/editorHelpers/lists/handleWrapIntoNestedList";
import { toggleListType } from "Items/RichText/editorHelpers/lists/toggleListType";
import { getListTypeAtSelectionStart } from "Items/RichText/editorHelpers/lists/getListTypeAtSelectionStart";
import { setLink } from "Items/RichText/editorHelpers/links/setLink";
import { selectWholeText } from "Items/RichText/editorHelpers/common/selectWholeText";
import { getSelectionMarks } from "Items/RichText/editorHelpers/common/getSelectionMarks";
import { clearText } from "Items/RichText/editorHelpers/common/clearText";
import { hasTextInSelection } from "Items/RichText/editorHelpers/common/hasTextInSelection";
import { MarkdownProcessor } from "Items/RichText/editorHelpers/markdown/markdownProcessor";
import { insertCopiedNodes } from "Items/RichText/editorHelpers/selectionOps/insertCopiedNodes";
import { moveCursorToEndOfTheText } from "Items/RichText/editorHelpers/common/moveCursorToEndOfText";
import { getFirstSelectionLink } from "Items/RichText/editorHelpers/links/getFirstSelectionLink";
import { setSelectionHorisontalAlignment } from "Items/RichText/editorHelpers/selectionOps/setSelectionHorisontalAlignment";
import { setSelectionFontHighlight } from "Items/RichText/editorHelpers/selectionOps/setSelectionFontHighlight";
import { setSelectionFontSize } from "Items/RichText/editorHelpers/selectionOps/setSelectionFontSize";
import { setSelectionFontStyle } from "Items/RichText/editorHelpers/selectionOps/setSelectionFontStyle";
import { setSelectionFontColor } from "Items/RichText/editorHelpers/selectionOps/setSelectionFontColor";

const { i18n } = conf;

// import { getSlateFragmentAttribute } from "slate-react/dist/utils/dom";

export class EditorContainer {
  readonly editor: BaseEditor & ReactEditor & HistoryEditor;

  maxWidth: number | undefined = undefined;
  textScale = 1;
  verticalAlignment: VerticalAlignment = "center";
  textLength = 0;
  markdownProcessor: MarkdownProcessor;

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
      blockNodes?: BlockNode[]
    ) => void,
    private updateElement: () => void
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
      apply: (op) => {
        if (op.type === "set_node" && "enableAuto" in op.newProperties) {
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
            const relativeFontSize = this.getFontSize() / this.getMatrixScale();
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
                  selection: JSON.parse(JSON.stringify(this.editor.selection)),
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

    this.markdownProcessor = new MarkdownProcessor(editor);
    this.markdownProcessor.subject.subscribe(
      (_processor: MarkdownProcessor) => {
        this.subject.publish(this);
      }
    );
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
    nodePath: number[]
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

  stopOpRecordingAndGetOps(): SlateOp[] {
    const op = this.recordedOps;
    this.recordedOps = null;

    const opsArr = (op?.ops ?? op ?? []) as Operation[];

    return opsArr.filter((op) => op.type !== "set_selection");
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
        error
      );
      console.error(
        "Error applying this type operation: ",
        op.ops?.map((op) => op.type)
      );
    }
  }

  // addFontStyle(style: TextStyle): void {
  // 	this.shouldEmit = false;
  // 	const editor = this.editor;
  // 	selectWholeText(editor);
  //
  // 	Editor.withoutNormalizing(editor, () => {
  // 		const marks = this.getSelectionMarks();
  // 		if (!marks) {
  // 			return;
  // 		}
  // 		const styles = marks.styles ? marks.styles.slice() : [];
  // 		if (!styles.includes(style)) {
  // 			styles.push(style);
  // 			Editor.addMark(editor, "styles", styles);
  // 		}
  // 	});
  // 	this.shouldEmit = true;
  // }
  //
  // removeFontStyle(style: TextStyle): void {
  // 	this.shouldEmit = false;
  // 	const editor = this.editor;
  // 	Editor.withoutNormalizing(editor, () => {
  // 		selectWholeText(editor);
  // 		const marks = this.getSelectionMarks();
  // 		if (!marks) {
  // 			return;
  // 		}
  // 		const styles = marks.styles ? marks.styles.slice() : [];
  // 		const index = styles.indexOf(style);
  // 		if (index !== -1) {
  // 			styles.splice(index, 1);
  // 			Editor.addMark(editor, "styles", styles);
  // 		}
  // 	});
  // 	this.shouldEmit = true;
  // }

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

  private applyWholeTextOp(op: WholeTextOp): void {
    const selection = this.editor.selection;
    selectWholeText(this.editor);
    switch (op.method) {
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

  setMaxWidth(maxWidth: number): void {
    this.emit({
      class: "RichText",
      method: "setMaxWidth",
      item: [this.id],
      maxWidth,
    });
  }

  setSelectionFontColor(format: string, selectionContext?: string): SlateOp[] {
    this.startOpRecording();
    setSelectionFontColor(this.editor, format, selectionContext);
    return this.stopOpRecordingAndGetOps();
  }

  setSelectionLink(
    link: string | undefined,
    selection: BaseSelection
  ): Operation[] {
    this.startOpRecording();
    setLink(this.editor, link, selection);
    return this.stopOpRecordingAndGetOps();
  }

  setSelectionFontStyle(style: TextStyle | TextStyle[]): SlateOp[] {
    this.startOpRecording();
    setSelectionFontStyle(this.editor, style);
    return this.stopOpRecordingAndGetOps();
  }

  setSelectionFontSize(
    fontSize: number | "auto",
    selectionContext?: string
  ): SlateOp[] {
    this.startOpRecording();
    const shouldUpdateElement = setSelectionFontSize(
      this.editor,
      this.getAutosize(),
      fontSize,
      selectionContext
    );
    if (shouldUpdateElement) {
      this.updateElement();
    }

    return this.stopOpRecordingAndGetOps();
  }

  setSelectionFontHighlight(
    format: string,
    selectionContext?: string
  ): SlateOp[] {
    this.startOpRecording();
    setSelectionFontHighlight(this.editor, format, selectionContext);
    return this.stopOpRecordingAndGetOps();
  }

  setSelectionHorisontalAlignment(
    horisontalAlignment: HorisontalAlignment,
    selectionContext?: string
  ): SlateOp[] {
    this.startOpRecording();
    setSelectionHorisontalAlignment(
      this.editor,
      horisontalAlignment,
      selectionContext
    );
    return this.stopOpRecordingAndGetOps();
  }

  getSelectionMarks(): Omit<TextNode, "text"> | null {
    return getSelectionMarks(this.editor);
  }

  handleListMerge(): boolean {
    return handleListMerge(this.editor);
  }

  getListTypeAtSelectionStart(): ListType | null {
    return getListTypeAtSelectionStart(this.editor);
  }

  handleSplitListItem(): boolean {
    return handleSplitListItem(this.editor);
  }

  includesListNode(): boolean {
    return this.getText().some(
      (node) => node.type === "ol_list" || node.type === "ul_list"
    );
  }

  toggleListType(targetListType: ListType, shouldWrap = true): boolean {
    const result = toggleListType(this.editor, targetListType, shouldWrap);
    this.subject.publish(this);
    return result;
  }

  withAutoList(): boolean {
    return withAutoList(this.editor);
  }

  handleWrapIntoNestedList(): boolean {
    const result = handleWrapIntoNestedList(this.editor);
    this.subject.publish(this);
    return result;
  }

  getFirstSelectionLink(selection: BaseSelection): string | undefined {
    return getFirstSelectionLink(this.editor, selection);
  }

  getText(): Descendant[] {
    return this.editor.children;
  }

  getTextParagraphs(lines: string[]): ParagraphNode[] {
    const newlines: ParagraphNode[] = [];

    lines.forEach((line) => {
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
    return createParagraphNode(text, this.editor, this.horisontalAlignment);
  }

  insertCopiedText(text: string): boolean {
    const lines = this.getTextParagraphs(text.split(/\r\n|\r|\n/));
    if (this.isLimitReached(lines)) {
      return true;
    }

    insertCopiedNodes(this.editor, lines);
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

  isLimitReached(nodes: BlockNode[]): boolean {
    if (this.getAutosize()) {
      if (!this.checkIsAutoSizeTextScaleAllowed(nodes)) {
        this.getOnLimitReached()();
        return true;
      }
    }
    return false;
  }

  insertCopiedNodes(nodes: BlockNode[]): boolean {
    if (this.isLimitReached(nodes)) {
      return true;
    }
    insertCopiedNodes(this.editor, nodes);
    this.subject.publish(this);
    return true;
  }

  hasTextInSelection(): boolean {
    return hasTextInSelection(this.editor);
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
    clearText(this.editor);
  }

  addText(text: string): void {
    this.editor.apply({
      type: "insert_text",
      text: text,
      path: [0, 0],
      offset: 0,
    });
  }

  selectWholeText() {
    selectWholeText(this.editor);
  }

  moveCursorToEndOfTheText(delay = 10) {
    moveCursorToEndOfTheText(this.editor, delay);
  }
}
