import {Line, Mbr, Path, Paths, Point, Transformation, TransformationOperation,} from "..";
import {Descendant, Transforms} from "slate";
import {HorisontalAlignment, VerticalAlignment} from "../Alignment";
import {Events, Operation} from "Board/Events";
import {TextStyle} from "./Editor/TextNode";
import {BlockType} from "./Editor/BlockNode";
import {RichTextData, RichTextOperation} from "./RichTextOperations";
import {Subject} from "Subject";
import {Geometry} from "../Geometry";
import {DrawingContext} from "../DrawingContext";
import {EditorContainer} from "./EditorContainer";
import {RichTextCommand} from "./RichTextCommand";
import {operationsRichTextDebugEnabled} from "./RichTextDebugSettings";
import {getBlockNodes} from "./RichTextCanvasRenderer";
import {isTextEmpty} from "./isTextEmpty";

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
	private transformedContainer?: Mbr = undefined

	constructor(
		public container: Mbr,
		private id = "",
		private events?: Events,
		readonly transformation = new Transformation(id, events),
		public placeholderText = "Type something",
		public isInShape = false,
		private autoSize = false
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
						this.transformCanvas();
					}
				} else if (op.method === "deserialize") {
					this.updateElement();
					this.transformCanvas();
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
		window.requestAnimationFrame(() => {
			if(this.autoSize) {
				this.calcAutoSize()
			} else {
				this.blockNodes = getBlockNodes(
					this.getTextForNodes(),
					this.getMaxWidth(),
				);
			}
			this.alignInRectangle(
				this.getTransformedContainer(),
				this.editor.verticalAlignment,
			);
			this.transformCanvas();
			this.updateRequired = false;
		});
	}

	calcAutoSize() {
		const cw = this.container.getWidth();
		const ch = this.container.getHeight();

		let blockNodes = getBlockNodes(
			this.getTextForNodes(),
			undefined,
		);
		const r = blockNodes.width / blockNodes.height;

		// https://glebkudr.atlassian.net/browse/BD-200?focusedCommentId=10053
		// 1/17
		if(r <= 0.058) {
			// never
			blockNodes = getBlockNodes(this.getTextForNodes(), blockNodes.width / 3);
			if (blockNodes.width < blockNodes.height) {
				blockNodes = getBlockNodes(this.getTextForNodes(), blockNodes.height)
			}
		}
		this.autoSizeScale = cw / blockNodes.width;
		console.log(this.autoSizeScale)
		this.blockNodes = getBlockNodes(this.getTextForNodes(),this.getMaxWidth())

		const left = (blockNodes.width - cw) * this.autoSizeScale / 2;
		const top = (blockNodes.height - ch) * this.autoSizeScale / 2

		this.transformedContainer = Mbr.fromDomRect({
			left,
			top,
			right: left + blockNodes.width * this.autoSizeScale,
			bottom: top + blockNodes.height * this.autoSizeScale
		} as DOMRect)

		return;
		if(!this.editor) return;
		if(!this.editor.getText()) return;
		if(!this.editor.getText()[0].children[0].text) return;

		var div = document.getElementById('shadow-autosize');
		if(!div) {
			div = document.createElement('div');
			div.id = 'shadow-autosize'
			div.style.visibility = "hidden"
			div.style.position = "absolute"
			div.style.top = "0"
			div.style.height = "auto"
			div.style.lineHeight = "1.4"
			div.style.wordBreak = "normal"
			div.style.whiteSpace = "pre-wrap"
			div.style.overflowWrap = "break-word"
			document.body.appendChild(div)
		}
		let proportions = this.editor.getText()[0].children
			.map((t: any) => "fontSize" in t ? t.fontSize : 1);
		const max = Math.max(...proportions);
		proportions = proportions.map((x: number) => x / max);
		div.innerHTML = this.editor.getText()[0].children.map((t: any) => {
			if(!("fontSize" in t)) {
				return "<span>{t.text}</span>"
			} else {
				return "<span style='font-size:{t.fontSize}px'>{t.text}</span>"
			}
		});
		div.style.width = (this.getTransformedContainer().getWidth() - 10) + 'px';
		div.style.fontSize = 288 + 'px';
		div.style.fontFamily = this.editor.getText()[0].children[0].fontFamily || "Arial";

		var estimate = 288;
		while(div.scrollHeight > (this.getTransformedContainer().getHeight() - 40)) {
			estimate *= 0.95;
			div.style.fontSize = estimate + 'px'
			if(estimate < 8) break
		}
		if( estimate != this.editor.getText()[0].children[0].fontSize ){
			this.editor.setSelectionFontSize(estimate)
		}
	}

	getMaxWidth(): number | undefined {
		if (this.isContainerSet) {
			return this.getTransformedContainer().getWidth();
		} else {
			return this.editor.maxWidth;
		}
	}

	getMaxHeight(): number | undefined {
		if (this.isContainerSet) {
			return this.getTransformedContainer().getHeight();
		} else {
			return undefined;
		}
	}

	getDimensions(): {
		width: number;
		height: number;
		maxWidth?: number;
		maxHeight?: number;
	} {
		const { width, height } = this.blockNodes;
		const maxWidth = this.getMaxWidth();
		const maxHeight = this.getMaxHeight();
		return {
			width,
			height,
			maxWidth: maxWidth ? maxWidth + 1 : undefined,
			maxHeight,
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
		this.subject.publish(this);
	}

	alignInRectangle(rect: Mbr, alignment: VerticalAlignment): void {
		const width = this.blockNodes.width;
		const height = this.blockNodes.height;
		const center = rect.getCenter();
		const left = center.x - width / 2;
		const top =
			alignment === "top"
				? rect.top
				: alignment === "bottom"
				? rect.bottom - height
				: center.y - height / 2;
		this.left = rect.left;
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
			this.editor.applyRichTextOp(op);
			this.updateElement();
		} else {
			return;
		}
		this.subject.publish(this);
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
		if(this.autoSize) {
			return this.autoSizeScale
		}
		return this.transformation.getScale().x;
	};

	/** The editor needs the left top point to render itself */
	getLeftTopPoint(): Point {
		if (this.transformedContainer) {
			const container = this.getTransformedContainer();
			return new Point(container.left + this.transformedContainer.left, container.top + this.transformedContainer.top);
		} else if (this.isContainerSet) {
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

	setSelectionFontColor(format: string): void {
		this.editor.setSelectionFontColor(format);
		this.updateElement();
	}

	setSelectionFontStyle(style: TextStyle | TextStyle[]): void {
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
		this.editor.setSelectionHorisontalAlignment(horisontalAlignment);
		this.updateElement();
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
		if (this.isInShape) {
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
	}

	serialize(): RichTextData {
		return {
			itemType: "RichText",
			verticalAlignment: this.editor.verticalAlignment,
			children: this.editor.editor.children,
			maxWidth: this.editor.maxWidth,
			transformation: this.isInShape
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
		this.subject.publish(this);
		return this;
	}

	render(context: DrawingContext): void {
		if (this.isRenderEnabled) {
			const { ctx } = context;
			ctx.save();
			ctx.translate(this.left, this.top);
			if (this.clipPath) {
				ctx.clip(this.clipPath);
			}
			if (!this.isInShape) {
				ctx.scale(
					this.transformation.matrix.scaleX,
					this.transformation.matrix.scaleY,
				);
			}
			this.blockNodes.render(ctx);
			ctx.restore();
		}
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
}
