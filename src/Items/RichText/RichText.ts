import {
	Connector,
	Line,
	Mbr,
	Path,
	Paths,
	Point,
	Transformation,
	TransformationOperation,
} from "..";
import { Descendant, Transforms, Editor } from "slate";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { Events, Operation } from "Board/Events";
import { TextStyle } from "./Editor/TextNode";
import { BlockType } from "./Editor/BlockNode";
import { RichTextData, RichTextOperation } from "./RichTextOperations";
import { Subject } from "Subject";
import { Geometry } from "../Geometry";
import { DrawingContext } from "../DrawingContext";
import { EditorContainer } from "./EditorContainer";
import { RichTextCommand } from "./RichTextCommand";
import { operationsRichTextDebugEnabled } from "./RichTextDebugSettings";
import { getBlockNodes } from "./RichTextCanvasRenderer";
import { isTextEmpty } from "./isTextEmpty";
import { Board } from "Board/Board";
import { SelectionContext } from "Board/Selection/Selection";

export const defaultTextStyle = {
	fontFamily: "Arial",
	fontSize: 14,
	fontColor: "black",
	fontHighlight: "",
	lineHeight: 1.4,
} as const;

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

	private isContainerSet = false;
	private isRenderEnabled = true;
	private blockNodes: any;
	private clipPath: Path2D | undefined;
	private updateRequired = false;
	private autoSizeScale = 1;
	private transformedContainer?: Mbr = undefined;
	private board?: Board;
	private containerMaxWidth?: number;

	constructor(
		public container: Mbr,
		private id = "",
		private events?: Events,
		readonly transformation = new Transformation(id, events),
		public placeholderText = "Type something",
		public isInShape = false,
		private autoSize = false,
	) {
		super();

		this.editor = new EditorContainer(
			id,
			this.emit,
			this.emitWithoutApplying,
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
		);
		this.editor.subject.subscribe((_editor: EditorContainer) => {
			this.subject.publish(this);
		});
		this.blockNodes = getBlockNodes(
			this.getTextForNodes(),
			this.getMaxWidth(),
		);
		this.transformation.subject.subscribe(
			(tr: Transformation, op: TransformationOperation) => {
				if (
					op.method === "translateTo" ||
					op.method === "translateBy"
				) {
					this.transformCanvas();
				} else if (op.method === "scaleTo" || op.method === "scaleBy") {
					if (!this.isInShape) {
						this.transformCanvas();
					} else {
						this.updateElement();
						// this.transformCanvas();
					}
				} else if (op.method === "deserialize") {
					this.updateElement();
					// this.transformCanvas();
				}
			},
		);
		this.updateElement();
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
							styles: [],
							fontColor: "black",
							fontHighlight: "",
							fontSize: 14,
							fontFamily: "Sans",
							horisontalAlignment: this.isInShape
								? "center"
								: "left",
							text: this.placeholderText,
						},
					],
				},
			];
		} else {
			return children;
		}
	}

	isEmpty(): boolean {
		return isTextEmpty(this.editor.editor.children);
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
			this.calcAutoSize(false);
			this.blockNodes = getBlockNodes(
				this.getTextForNodes(),
				this.getMaxWidth(),
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
		const text = this.getTextForNodes();
		const container = this.getTransformedContainer();
		const containerWidth = container.getWidth();
		const containerHeight = container.getHeight();
		const width = this.container.getWidth();
		const maxWidth = width;
		const blockNodes = getBlockNodes(text, maxWidth);

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
		const textWidth = blockNodes.width;
		const textHeight = blockNodes.height;
		const textScale = Math.min(
			containerWidth / textWidth,
			containerHeight / textHeight,
		);
		this.autoSizeScale = textScale;
		// this.maxWidth = maxWidth;
		this.maxHeight = containerHeight / textScale;
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

	/** Get text dimensions for text editor */
	getDimensions(): {
		width: number;
		height: number;
		maxWidth?: number;
		maxHeight?: number;
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
				this.editor.maxWidth ?? this.blockNodes.width,
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
	setContainer(container: Mbr): void {
		this.isContainerSet = true;
		this.container = container;
		this.alignInRectangle(
			this.getTransformedContainer(),
			this.editor.verticalAlignment,
		);
	}

	setMaxWidth(maxWidth: number): this {
		this.containerMaxWidth = maxWidth;
		return this;
	}

	/**
	 * Get the container that would be used to align the CanvasDocument.
	 */
	getTransformedContainer(): Mbr {
		const matrix = this.transformation.matrix;
		return this.container.getTransformed(matrix);
	}

	emitWithoutApplying = (op: RichTextOperation): void => {
		if (operationsRichTextDebugEnabled) {
			console.info("<- RichText.emitWithoutApplying", op);
		}
		if (this.events) {
			const command = new RichTextCommand([this], op);
			this.events.emit(op, command);
		}
	};

	emit = (op: RichTextOperation): void => {
		if (operationsRichTextDebugEnabled) {
			console.info("<- RichText.emit", op);
		}
		if (this.events) {
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
			if (op.method === "edit") {
				this.editor.applyRichTextOp(op);
				this.updateElement();
			} else if (this.maxCapableChartsInSticker(op)) {
				this.editor.applyRichTextOp(op);
				this.updateElement();
			}
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

	getScale = (): number => {
		if (this.autoSize) {
			return this.autoSizeScale;
		}
		return this.transformation.getScale().x;
	};

	/** The editor needs the left top point to render itself
    getLeftTopPoint(): Point {
        if (this.autoSize) {
            const x = this.left;
            const y = this.getTransformedContainer().top;
            return new Point(x, y);
        }
        if (this.isContainerSet) {
            const container = this.getTransformedContainer();
            const x = container.left;
            const y = container.top;
            return new Point(x, y);
        } else {
            const x = this.left;
            const y = this.top;
            return new Point(x, y);
        }
    }
    */

	setSelectionFontColor(format: string): void {
		this.editor.setSelectionFontColor(format);
		this.updateElement();
	}

	setSelectionFontStyle(style: TextStyle | TextStyle[], selectionContext?: SelectionContext): void {
		if (selectionContext === "EditUnderPointer") {
			const start = Editor.start(this.editor.editor, []);
			const end = Editor.end(this.editor.editor, []);
			const range = { anchor: start, focus: end };
			this.editorTransforms.select(this.editor.editor, range);
		}
		this.editor.setSelectionFontStyle(style);
		this.updateElement();
	}

	setSelectionFontFamily(fontFamily: string): void {
		this.editor.setSelectionFontFamily(fontFamily);
		this.updateElement();
	}

	setSelectionFontSize(fontSize: number): void {
		if (this.isInShape) {
			this.editor.setSelectionFontSize(fontSize);
		} else {
			const scaledFontSize = fontSize / this.getScale();
			this.editor.setSelectionFontSize(scaledFontSize);
		}
		this.updateElement();
	}

	setSelectionFontHighlight(format: string): void {
		this.editor.setSelectionFontHighlight(format);
		this.updateElement();
	}

	setSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
	): void {
		console.log("set alignment inside RichText: ", horisontalAlignment);
		this.editor.setSelectionHorisontalAlignment(horisontalAlignment);
		this.updateElement();
	}

	setBoard(board: Board): this {
		this.board = board;
		return this;
	}

	getFontStyles(): TextStyle[] {
		const marks = this.editor.getSelectionMarks();
		return marks?.styles ?? [];
	}

	getFontColor(): string {
		const marks = this.editor.getSelectionMarks();
		return marks?.fontColor ?? defaultTextStyle.fontColor;
	}

	getFontFamily(): string {
		const marks = this.editor.getSelectionMarks();
		return marks?.fontFamily ?? defaultTextStyle.fontFamily;
	}

	getFontSize(): number {
		const marks = this.editor.getSelectionMarks();
		const fontSize = marks?.fontSize ?? defaultTextStyle.fontSize;
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
		return marks?.fontHighlight ?? defaultTextStyle.fontHighlight;
	}

	getBlockType(): BlockType {
		const blockNode = this.editor.getSelectedBlockNode();
		return blockNode ? blockNode.type : "paragraph";
	}

	getHorisontalAlignment(): HorisontalAlignment | undefined {
		const blockNode = this.editor.getSelectedBlockNode();
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
		this.updateElement();
		this.subject.publish(this);
	}

	serialize(): RichTextData {
		return {
			itemType: "RichText",
			verticalAlignment: this.editor.verticalAlignment,
			children: this.editor.editor.children,
			maxWidth: this.editor.maxWidth,
			containerMaxWidth: this.getMaxWidth(),
			transformation:
				this.isInShape || this.autoSize
					? undefined
					: this.transformation.serialize(),
		};
	}

	deserialize(data: Partial<RichTextData>): this {
		if (data.verticalAlignment) {
			this.editor.verticalAlignment = data.verticalAlignment;
		}
		if (data.maxWidth) {
			this.editor.maxWidth = data.maxWidth;
		}
		if (data.children) {
			this.editor.editor.children = data.children;
		}
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.containerMaxWidth) {
			this.containerMaxWidth = data.containerMaxWidth;
		}
		this.updateElement();
		this.subject.publish(this);
		return this;
	}

	render(context: DrawingContext): void {
		if (this.isRenderEnabled) {
			const { ctx } = context;
			ctx.save();
			ctx.translate(this.left, this.top);

			if (this.autoSize) {
				ctx.scale(this.autoSizeScale, this.autoSizeScale);
			} else if (!this.isInShape) {
				ctx.scale(
					this.transformation.matrix.scaleX,
					this.transformation.matrix.scaleY,
				);
			}
			if (this.clipPath) {
				ctx.clip(this.clipPath);
			}
			this.blockNodes.render(ctx);

			ctx.restore();
		}
	}

	getClipMbr(): Mbr {
		const mbr = this.getMbr();
		const center = mbr.getCenter();
		const { width, height } = this.blockNodes;
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

	selectText(): void {
		this.editor.editor.apply({
			type: "set_selection",

			newProperties: {
				anchor: {
					offset: this.editor.textLength,
					path: [0, this.editor.textLength],
				},
				focus: {
					offset: 0,
					path: [0, 0],
				},
			},
			properties: null,
		});
	}

	autosizeEnable(): void {
		this.autoSize = true;
		this.isInShape = false;
		this.updateElement();
		this.subject.publish(this);
	}

	autosizeDisable(): void {
		this.autoSize = false;
		this.isInShape = true;
		this.updateElement();
		this.subject.publish(this);
	}

	getAutosize(): boolean {
		return this.autoSize;
	}

	getMaxFontSize(): number {
		const marks = this.editor.getSelectionMarks();
		const fontSize = marks?.fontSize ?? defaultTextStyle.fontSize;
		return fontSize * this.autoSizeScale;
	}
}
