import { Board } from "Board";
import { Events, Operation } from "Board/Events";
import { SelectionContext } from "Board/Selection/Selection";
import i18next from "i18next";
import { Descendant, Editor, Transforms } from "slate";
import { ReactEditor } from "slate-react";
import { DOMPoint } from "slate-react/dist/utils/dom";
import { Subject } from "Subject";
import { DEFAULT_TEXT_STYLES } from "View/Items/RichText";
import {
	Line,
	Mbr,
	Path,
	Paths,
	Point,
	RichTextData,
	Transformation,
	TransformationOperation,
} from "..";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { DrawingContext } from "../DrawingContext";
import { Geometry } from "../Geometry";
import { LayoutBlockNodes } from "./CanvasText";
import { BlockType } from "./Editor/BlockNode";
import { TextStyle } from "./Editor/TextNode";
import { EditorContainer } from "./EditorContainer";
import { isTextEmpty } from "./isTextEmpty";
import { getBlockNodes } from "./RichTextCanvasRenderer";
import { RichTextCommand } from "./RichTextCommand";
import { operationsRichTextDebugEnabled } from "./RichTextDebugSettings";
import { RichTextOperation } from "./RichTextOperations";

export type DefaultTextStyles = {
	fontFamily: string;
	fontSize: number;
	fontColor: string;
	fontHighlight: string;
	lineHeight: number;
};

let isEditInProcessValue = false;

export function isEditInProcess(): boolean {
	return isEditInProcessValue;
}

export function toggleEdit(value: boolean): void {
	isEditInProcessValue = value;
}

/**
 * A geometric item to render a rich text on a DrawingContext.
 *
 */
export class RichText extends Mbr implements Geometry {
	readonly itemType = "RichText";
	parent = "Board";
	readonly subject = new Subject<RichText>();
	readonly editor: EditorContainer;

	readonly editorTransforms = Transforms;
	readonly editorEditor = Editor;

	private isContainerSet = false;
	isRenderEnabled = true;
	private blockNodes: LayoutBlockNodes;
	private clipPath: Path2D | undefined;
	private updateRequired = false;
	private autoSizeScale = 1;
	private containerMaxWidth?: number;
	private shouldEmit = true;
	maxHeight: number;
	transformationRenderBlock?: boolean = undefined;
	lastClickPoint?: Point;
	frameMbr?: Mbr;

	constructor(
		public container: Mbr,
		private id = "",
		private events?: Events,
		readonly transformation = new Transformation(id, events),
		public placeholderText = i18next.t("board.textPlaceholder"),
		public isInShape = false,
		private autoSize = false,
		public insideOf?: string,
		private initialTextStyles: DefaultTextStyles = DEFAULT_TEXT_STYLES,
	) {
		super();

		this.editor = new EditorContainer(
			id,
			this.emit,
			(op: RichTextOperation) => {
				this.emitWithoutApplying(op);
				this.updateElement();
				this.subject.publish(this);
			},
			(): void => {
				if (this.events) {
					// this.events.undo(false);
					this.events.undo();
				}
			},

			(): void => {
				if (this.events) {
					// this.events.redo(false);
					this.events.redo();
				}
			},
			this.getScale,
			this.getDefaultHorizontalAlignment(),
			initialTextStyles,
		);
		this.editor.subject.subscribe((_editor: EditorContainer) => {
			this.subject.publish(this);
		});
		this.transformation.subject.subscribe(
			(tr: Transformation, op: TransformationOperation) => {
				if (
					op.method === "translateTo" ||
					op.method === "translateBy" ||
					op.method === "transformMany"
				) {
					this.transformCanvas();
				} else if (
					op.method === "scaleTo" ||
					op.method === "scaleBy" ||
					op.method === "scaleByTranslateBy"
				) {
					if (!this.isInShape) {
						this.transformCanvas();
					} else {
						this.updateElement();
					}
				} else if (op.method === "deserialize") {
					this.updateElement();
				}
			},
		);
		this.blockNodes = getBlockNodes(
			this.getTextForNodes(),
			this.getMaxWidth(),
			this.insideOf,
			undefined,
			undefined,
			this.frameMbr,
		);
		this.editorTransforms.select(this.editor.editor, {
			offset: 0,
			path: [0, 0],
		});
	}

	getTextForNodes() {
		const children = this.editor.editor.children;
		if (isTextEmpty(children)) {
			return [
				{
					type: "paragraph",
					lineHeight: 1.4,
					children: [
						{
							type: "text",
							// styles: this.getFontStyles().includes("bold")
							// 	? "bold"
							// 	: "",
							bold: this.getFontStyles().includes("bold"),
							italic: this.getFontStyles().includes("italic"),
							underline:
								this.getFontStyles().includes("underline"),
							"line-through":
								this.getFontStyles().includes("line-through"),
							fontColor: this.getFontColor(),
							fontHighlight: "",
							fontSize: this.getFontSize(),
							fontFamily: this.getFontFamily(),
							horisontalAlignment:
								this.getDefaultHorizontalAlignment(),
							text: this.placeholderText,
						},
					],
				},
			];
		} else {
			return children;
		}
	}

	getDefaultHorizontalAlignment(): HorisontalAlignment {
		switch (this.insideOf) {
			case "Sticker":
				return "center";
			case "Shape":
				return "center";
			default:
				return "left";
		}
	}

	isEmpty(): boolean {
		return isTextEmpty(this.editor.editor.children);
	}

	handleInshapeScale(): void {
		if (this.isInShape) {
			if (
				this.getTextWidth() > (this.getMaxWidth() || 0) ||
				this.hasWraps()
			) {
				this.updateElement();
			} else {
				this.transformCanvas();
				this.recoordinate(this.getMaxWidth());
			}
		}
	}

	handleFocus = (): void => {
		isEditInProcessValue = true;
	};

	handleBlur = (): void => {
		isEditInProcessValue = false;
	};

	updateElement(): void {
		if (this.updateRequired) {
			return;
		}
		this.updateRequired = true;
		// window.requestAnimationFrame(() => {
		if (this.autoSize) {
			this.calcAutoSize();
		} else {
			// this.calcAutoSize(false);
			this.blockNodes = getBlockNodes(
				this.getTextForNodes(),
				this.getMaxWidth(),
				this.insideOf,
				undefined,
				undefined,
				this.frameMbr,
			);
			if (
				this.containerMaxWidth &&
				this.blockNodes.width >= this.containerMaxWidth
			) {
				this.blockNodes.width = this.containerMaxWidth;
			}
		}

		// this.blockNodes.maxWidth = this.getWidth()

		this.alignInRectangle(
			this.getTransformedContainer(),
			this.editor.verticalAlignment,
		);
		this.transformCanvas();
		this.updateRequired = false;
		// });
	}

	calcAutoSize(shouldUpdate = true): void {
		const text = this.getText();
		const container = this.getTransformedContainer();
		const containerWidth = container.getWidth();
		const containerHeight = container.getHeight();
		const width = this.container.getWidth();
		const maxWidth = width;
		const blockNodes =
			this.insideOf !== "Sticker"
				? getBlockNodes(text, maxWidth, this.insideOf)
				: this.autoSizeScale < 1
				? getBlockNodes(
						text,
						containerWidth / this.autoSizeScale,
						this.insideOf,
				  )
				: getBlockNodes(
						text,
						containerWidth,
						this.insideOf,
						containerWidth,
						containerHeight,
				  );
		/*

        if (blockNodes.height / blockNodes.width < (1 / 7)) {

            maxWidth = blockNodes.width / 3
            if (maxWidth > width) {
                maxWidth = width;
            }
            blockNodes = getBlockNodes(text, maxWidth);
            if (blockNodes.width < blockNodes.height) {
                maxWidth = blockNodes.height;
                blockNodes = getBlockNodes(text, maxWidth);
            }
        }
        */

		if (shouldUpdate) {
			this.blockNodes = blockNodes;
		}
		const textWidth = this.blockNodes.width;
		const textHeight = this.blockNodes.height;
		const textScale = Math.min(
			containerWidth / textWidth,
			containerHeight / textHeight,
		);
		this.autoSizeScale = textScale;
		// this.maxWidth = maxWidth;
		this.maxHeight = containerHeight / textScale;
	}

	getTextWidth(): number {
		return this.blockNodes.width;
	}

	getMaxWidth(): number | undefined {
		if (this.autoSize) {
			return this.editor.maxWidth;
		}
		if (this.isContainerSet) {
			return this.getTransformedContainer().getWidth();
		} else {
			return this.containerMaxWidth || this.editor.maxWidth;
		}
	}

	getMaxHeight(): number | undefined {
		if (this.autoSize) {
			return this.maxHeight;
		}
		if (this.isContainerSet) {
			return this.getTransformedContainer().getHeight();
		} else {
			return undefined;
		}
	}

	addText(text: string): void {
		this.editor.editor.apply({
			type: "insert_text",
			text: text,
			path: [0, 0],
			offset: 0,
		});
	}

	/** Get text dimensions for text editor */
	getDimensions(): {
		point: Point;
		width: number;
		height: number;
		maxWidth?: number;
		maxHeight?: number;
		textScale: number;
	} {
		let left = this.left;
		let top = this.top;
		const { width, height } = this.blockNodes;
		const maxWidth = this.getMaxWidth();
		const maxHeight = this.getMaxHeight();
		const container = this.getTransformedContainer();

		if (this.autoSize) {
			left = container.left;
			top = container.top;
		} else if (this.isContainerSet) {
			left = container.left;
			top = container.top;
		}

		if (this.frameMbr) {
			top = this.frameMbr.top - height - 8;
		}

		return {
			point: new Point(left, top),
			width,
			height,
			maxWidth: maxWidth ? maxWidth + 1 : undefined,
			maxHeight,
			textScale: this.isInShape ? 1 : this.getScale(),
		};
	}

	transformCanvas(): void {
		if (!this.isContainerSet) {
			this.container = new Mbr(
				0,
				0,
				this.blockNodes.width,
				this.blockNodes.height,
			);
			const transformed = this.getTransformedContainer();
			this.left = transformed.left;
			this.top = transformed.top;
			this.right = transformed.right;
			this.bottom = transformed.bottom;
		} else {
			this.alignInRectangle(
				this.getTransformedContainer(),
				this.editor.verticalAlignment,
			);
		}
		this.setClipPath();
		if (!this.isInShape && !this.autoSize) {
			this.subject.publish(this);
		}
	}

	alignInRectangle(rect: Mbr, alignment: VerticalAlignment): void {
		const center = rect.getCenter();
		let width = this.blockNodes.maxWidth;
		let height = this.blockNodes.height;
		let left = rect.left;
		if (this.autoSize) {
			width = width * this.autoSizeScale;
			height = height * this.autoSizeScale;
			left = center.x - width / 2;
		}
		const top =
			alignment === "top"
				? rect.top
				: alignment === "bottom"
				? rect.bottom - height
				: center.y - height / 2;
		this.left = left;
		this.top = Math.max(top, rect.top);
		this.right = left + width;
		this.bottom = top + height;

		if (this.frameMbr) {
			this.top = this.frameMbr.top - height - 8;
			this.bottom = this.frameMbr.top - 8;
		}

		if (this.insideOf === "Sticker" || this.insideOf === "Shape") {
			this.left = rect.left;
			this.right = rect.right;
		}
	}

	setClipPath(): void {
		const container = this.getTransformedContainer();
		const width = container.getWidth();
		const height = container.getHeight();
		this.clipPath = new Path2D();
		this.clipPath.rect(0, 0, width, height);
	}
	/**
	 * Set the container that would be used to align the CanvasDocument.
	 */
	setContainer(container: Mbr, frameMbr?: Mbr): void {
		this.isContainerSet = true;
		this.container = container;
		this.frameMbr = frameMbr;
		this.alignInRectangle(
			this.getTransformedContainer(),
			this.editor.verticalAlignment,
		);
	}

	setMaxWidth(maxWidth: number): this {
		this.containerMaxWidth = maxWidth;
		return this;
	}

	setBoard(board: Board): void {
		this.board = board;
	}

	/**
	 * Get the container that would be used to align the CanvasDocument.
	 */
	getTransformedContainer(): Mbr {
		const matrix = this.transformation.matrix;
		return this.container.getTransformed(matrix);
	}

	emitWithoutApplying = (op: RichTextOperation): void => {
		if (this.events) {
			const command = new RichTextCommand([this], op);
			this.events.emit(op, command);
		}
		// this.updateElement();
	};

	emit = (op: RichTextOperation): void => {
		if (operationsRichTextDebugEnabled) {
			console.info("<- RichText.emit", op);
		}
		if (this.events && this.shouldEmit) {
			const command = new RichTextCommand([this], op);
			command.apply();
			this.events.emit(op, command);
		} else {
			this.apply(op);
		}
	};

	apply(op: Operation): void {
		if (op.class === "Transformation") {
			this.transformation.apply(op);
		} else if (op.class === "RichText") {
			if (op.method === "setMaxWidth") {
				this.setMaxWidth(op.maxWidth);
			} else if (op.method === "setFontSize") {
				if (op.fontSize === "auto") {
					this.autosizeEnable();
					this.applySelectionFontSize(14, op.context);
				} else {
					this.autosizeDisable();
					this.applySelectionFontSize(op.fontSize, op.context);
				}
			} else {
				this.editor.applyRichTextOp(op);
			}
			this.updateElement();
		} else {
			return;
		}
		this.subject.publish(this);
	}

	maxCapableChartsInSticker(op: Operation): boolean {
		const fontSize = this.getText()[0]?.children[0].fontSize;
		const height = this.getMaxHeight();
		const width = this.getMaxWidth();
		const lineHeight = fontSize * 1.4;
		const maxLine = Math.round((height || 0) / lineHeight);
		const text = this.getText();
		const getWidthOfString = (text: string): number => {
			const span = document.createElement("span");
			span.textContent = text;
			span.style.fontSize = `${fontSize}px`;
			span.style.visibility = "hidden";
			document.body.appendChild(span);

			const width = span.offsetWidth;

			document.body.removeChild(span);
			return width;
		};

		const lineCount = text.reduce((count, node) => {
			if (node.type === "paragraph") {
				if (node.children[0].text.length === 0) {
					return count + 1;
				}
				const countStr = Math.ceil(
					getWidthOfString(node.children[0].text) / (width || 1),
				);
				return count + countStr;
			} else {
				return count + 1;
			}
		}, 0);

		if (
			op.ops?.[0]?.type === "split_node" ||
			op.ops?.[0]?.type === "insert_text"
		) {
			return !(lineCount + 1 > maxLine);
		} else {
			return true;
		}
	}

	/** Moves cursor to the end of first line */
	moveCursorToEOL(delay = 10): void {
		setTimeout(() => {
			this.editorTransforms.move(this.editor.editor, {
				distance: 1,
				unit: "line",
			});
		}, delay);
	}

	forceCursorToTheEnd(): void {
		this.selectWholeText();
		Transforms.collapse(this.editor.editor, { edge: "end" });
	}

	/** Moves cursor to the end of a text */
	moveCursorToEnd(delay = 10) {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				this.editorTransforms.move(this.editor.editor, {
					distance: this.getTextString().length,
					unit: "character",
				});
			}, delay);
			resolve();
		});
	}

	getId(): string {
		return this.id;
	}

	setId(id: string): this {
		this.id = id;
		this.editor.setId(id);
		return this;
	}

	getText(): Descendant[] {
		return this.editor.getText();
	}

	getTextString(): string {
		return this.getText()
			.filter(desc => desc.type === "paragraph")
			.flatMap(paragraph => paragraph.children)
			.map(node => node.text)
			.join("\n");
	}

	getScale = (): number => {
		if (this.autoSize) {
			return this.autoSizeScale;
		}
		return this.transformation.getScale().x;
	};

	selectWholeText(): void {
		this.editor.selectWholeText();
	}

	setSelectionFontColor(
		format: string,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.selectWholeText();
		}
		this.editor.setSelectionFontColor(format, selectionContext);
		this.updateElement();
	}

	setSelectionFontStyle(
		style: TextStyle | TextStyle[],
		selectionContext?: SelectionContext,
	): void {
		if (
			selectionContext === "EditUnderPointer" ||
			selectionContext === "SelectByRect"
		) {
			this.selectWholeText();
		}
		this.editor.setSelectionFontStyle(style);
		this.updateElement();
	}

	setSelectionFontFamily(fontFamily: string): void {
		this.editor.setSelectionFontFamily(fontFamily);
		this.updateElement();
	}

	applySelectionFontSize(
		fontSize: number,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.selectWholeText();
		}
		this.shouldEmit = false;
		if (this.isInShape) {
			this.editor.applySelectionFontSize(fontSize, selectionContext);
		} else {
			const scaledFontSize = fontSize / this.getScale();
			this.editor.applySelectionFontSize(
				scaledFontSize,
				selectionContext,
			);
		}
		this.shouldEmit = true;
		this.updateElement();
	}

	setSelectionFontSize(
		fontSize: number,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.selectWholeText();
		}
		if (this.isInShape) {
			this.editor.setSelectionFontSize(fontSize, selectionContext);
		} else {
			const scaledFontSize = fontSize / this.getScale();
			this.editor.setSelectionFontSize(scaledFontSize, selectionContext);
		}
		this.updateElement();
	}

	setSelectionFontHighlight(
		format: string,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.selectWholeText();
		}
		this.editor.setSelectionFontHighlight(format, selectionContext);
		this.updateElement();
	}

	setEditorFocus(selectionContext?: SelectionContext): void {
		this.editor.setEditorFocus(selectionContext);
	}

	setSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.selectWholeText();
		}
		this.editor.setSelectionHorisontalAlignment(
			horisontalAlignment,
			selectionContext,
		);
		this.updateElement();
	}

	applySetSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.selectWholeText();
		}
		this.shouldEmit = false;
		this.editor.setSelectionHorisontalAlignment(horisontalAlignment);
		this.shouldEmit = true;
		this.updateElement();
	}

	getFontStyles(): TextStyle[] {
		const styles = this.editor.getSelectionStyles();
		return styles ?? [];
	}

	getFontColor(): string {
		const marks = this.editor.getSelectionMarks();
		if (this.initialFontColor) {
			const color = this.initialFontColor;
			this.initialFontColor = undefined;
			return color;
		}
		return marks?.fontColor ?? this.initialTextStyles.fontColor;
	}

	getFontFamily(): string {
		const marks = this.editor.getSelectionMarks();
		return marks?.fontFamily ?? this.initialTextStyles.fontFamily;
	}

	getFontSize(): number {
		const marks = this.editor.getSelectionMarks();
		const fontSize = marks?.fontSize ?? this.initialTextStyles.fontSize;
		if (this.autoSize) {
			return fontSize * this.autoSizeScale;
		} else if (this.isInShape) {
			return fontSize;
		} else {
			return fontSize * this.transformation.getScale().x;
		}
	}

	getFontHighlight(): string {
		const marks = this.editor.getSelectionMarks();
		return marks?.fontHighlight ?? this.initialTextStyles.fontHighlight;
	}

	getBlockType(): BlockType {
		const blockNode = this.editor.getSelectedBlockNode();
		return blockNode ? blockNode.type : "paragraph";
	}

	getHorisontalAlignment(): HorisontalAlignment | undefined {
		const blockNode = this.editor.getSelectedBlockNode()
			? this.editor.getSelectedBlockNode()
			: this.editor.editor.children[0];
		switch (blockNode?.type) {
			case "paragraph":
			case "heading":
			case "block-quote":
				return blockNode.horisontalAlignment;
			default:
				return "center";
		}
	}

	getVerticalAlignment(): VerticalAlignment {
		return this.editor.verticalAlignment;
	}

	saveLastClickPoint(board: Board): void {
		const point = board.pointer.point.copy();
		point.transform(board.camera.getMatrix());
		this.lastClickPoint = point;
	}

	getLastClickPoint(): Point | undefined {
		return this.lastClickPoint?.copy();
	}

	clearLastClickPoint(): void {
		this.lastClickPoint = undefined;
	}

	setCursorUnderLastClick(ref: HTMLDivElement | null): void {
		const point = this.getLastClickPoint();
		if (ref && point) {
			this.clearLastClickPoint();
			const domMbr = ref.getBoundingClientRect();
			const refMbr = new Mbr(
				domMbr.left,
				domMbr.top,
				domMbr.right,
				domMbr.bottom,
			);
			// if there are TS errors, document.caretPositionFromPoint can support most browser, need to refactor
			// FYI https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint
			if (
				refMbr.isInside(point) && // @ts-expect-error: Suppress TS error for non-existent method
				(document.caretPositionFromPoint ||
					document.caretRangeFromPoint)
			) {
				// @ts-expect-error: Suppress TS error for non-existent method
				const domRange = document.caretPositionFromPoint
					? // @ts-expect-error: Suppress TS error for non-existent method
					  document.caretPositionFromPoint(point.x, point.y)
					: document.caretRangeFromPoint(point.x, point.y);
				// @ts-expect-error: Suppress TS error for non-existent method
				const textNode = document.caretPositionFromPoint
					? domRange.offsetNode
					: domRange.startContainer;
				// @ts-expect-error: Suppress TS error for non-existent method
				const offset = document.caretPositionFromPoint
					? domRange.offset
					: domRange.startOffset;
				const domPoint = [textNode, offset] as DOMPoint;
				const slatePoint = ReactEditor.toSlatePoint(
					this.editor.editor,
					domPoint,
					{
						exactMatch: false,
						suppressThrow: false,
					},
				);
				const nRange = { anchor: slatePoint, focus: slatePoint };
				this.editorTransforms.select(this.editor.editor, nRange);
				ReactEditor.focus(this.editor.editor);
			} else {
				if (
					!(
						// @ts-expect-error: Suppress TS error for non-existent method
						(
							document.caretPositionFromPoint ||
							document.caretRangeFromPoint
						)
					)
				) {
					console.error(
						"document.caretPositionFromPoint and document.caretRangeFromPoint are not available!",
					);
				}
				// this.forceCursorToTheEnd(); // Uncomment if necessary
				ReactEditor.focus(this.editor.editor);
			}
		}
	}

	undo(): void {
		this.editor.editor.undo();
	}

	redo(): void {
		this.editor.editor.redo();
	}

	disableRender(): void {
		this.isRenderEnabled = false;
	}

	enableRender(): void {
		this.isRenderEnabled = true;
		this.subject.publish(this);
	}

	serialize(): RichTextData {
		return {
			itemType: "RichText",
			verticalAlignment: this.editor.verticalAlignment,
			children: this.editor.editor.children,
			maxWidth: this.editor.maxWidth,
			containerMaxWidth: this.getMaxWidth(),
			placeholderText: this.placeholderText,
			transformation:
				this.isInShape || this.autoSize
					? undefined
					: this.transformation.serialize(),
			insideOf: this.insideOf ? this.insideOf : this.itemType,
			realSize: this.autoSize ? "auto" : this.getFontSize(),
		};
	}

	deserialize(data: Partial<RichTextData>): this {
		if (data.children) {
			this.editor.editor.children = data.children;
		}
		if (data.verticalAlignment) {
			this.editor.verticalAlignment = data.verticalAlignment;
		}
		if (data.maxWidth) {
			this.editor.applyMaxWidth(data.maxWidth);
		}
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.containerMaxWidth) {
			this.containerMaxWidth = data.containerMaxWidth;
		}
		if (data.placeholderText) {
			this.placeholderText = data.placeholderText;
		}
		if (data.realSize === "auto") {
			this.autosizeEnable();
		} else {
			this.autosizeDisable();
		}
		this.insideOf = data.insideOf;
		this.updateElement();
		this.subject.publish(this);
		return this;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		if (this.isRenderEnabled) {
			const { ctx } = context;
			ctx.save();
			ctx.translate(this.left, this.top);

			if (!this.isInShape && !this.autoSize) {
				ctx.scale(
					this.transformation.matrix.scaleX,
					this.transformation.matrix.scaleY,
				);
			}
			if (
				this.clipPath &&
				(this.insideOf === "Shape" || this.insideOf === "Sticker")
			) {
				ctx.clip(this.clipPath);
			}
			if (this.autoSize) {
				this.blockNodes.render(ctx, this.autoSizeScale);
			} else {
				this.blockNodes.render(ctx);
			}
			ctx.restore();
		}
	}

	clearText(): void {
		this.editorTransforms.select(this.editor.editor, {
			anchor: this.editorEditor.start(this.editor.editor, []),
			focus: this.editorEditor.end(this.editor.editor, []),
		});
		this.editorTransforms.delete(this.editor.editor);
	}

	getClipMbr(): Mbr {
		const mbr = this.getMbr();
		const center = mbr.getCenter();
		const { width } = this.blockNodes;
		mbr.left = center.x - width / 2;
		mbr.right = mbr.left + width;
		return mbr;
	}

	getPath(): Path | Paths {
		const { left, top, right, bottom } = this.getMbr();
		const leftTop = new Point(left, top);
		const rightTop = new Point(right, top);
		const rightBottom = new Point(right, bottom);
		const leftBottom = new Point(left, bottom);
		return new Path(
			[
				new Line(leftTop, rightTop),
				new Line(rightTop, rightBottom),
				new Line(rightBottom, leftBottom),
				new Line(leftBottom, leftTop),
			],
			true,
		);
	}

	getSnapAnchorPoints(): Point[] {
		const mbr = this.getMbr();
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		return [
			new Point(mbr.left + width / 2, mbr.top),
			new Point(mbr.left + width / 2, mbr.bottom),
			new Point(mbr.left, mbr.top + height / 2),
			new Point(mbr.right, mbr.top + height / 2),
		];
	}

	isClosed(): boolean {
		return true;
	}

	autosizeEnable(): void {
		this.autoSize = true;
		this.isInShape = false;
	}

	autosizeDisable(): void {
		this.autoSize = false;
		this.autoSizeScale = 1;
		if (this.insideOf && this.insideOf !== "RichText") {
			this.isInShape = true;
		}
	}

	getAutosize(): boolean {
		return this.autoSize;
	}

	getAutoSizeScale(): number {
		return this.autoSizeScale;
	}

	scaleAutoSizeScale(scale: number): number {
		this.autoSizeScale *= scale;
		return this.autoSizeScale;
	}

	realign(): void {
		const maxWidth = this.getMaxWidth();
		if (maxWidth) {
			this.blockNodes.realign(maxWidth);
		} else {
			this.blockNodes.realign(this.getTransformedContainer().getWidth());
		}
	}

	recoordinate(newMaxWidth?: number): void {
		this.blockNodes.recoordinate(newMaxWidth);
	}

	hasWraps(): boolean {
		return this.blockNodes.nodes.some(
			node => node.height > node.lineHeight * this.getFontSize(),
		);
	}

	getMaxFontSize(): number {
		const marks = this.editor.getSelectionMarks();
		const fontSize = marks?.fontSize ?? this.initialTextStyles.fontSize;
		return fontSize * this.autoSizeScale;
	}

	splitNode(): void {
		Transforms.splitNodes(this.editor.editor, { always: true });
	}
}
