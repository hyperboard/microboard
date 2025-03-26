import { Board } from "Board";
import { Camera } from "Board/Camera";
import { Operation } from "Board/Events";
import {
	scaleElementBy,
	translateElementBy,
} from "Board/HTMLRender/HTMLRender";
import { SelectionContext } from "Board/Selection/Selection";
import {
	BaseRange,
	BaseSelection,
	Descendant,
	Editor,
	Element,
	Operation as SlateOp,
	Text,
	Transforms,
} from "slate";
import { ReactEditor } from "slate-react";
import { DOMPoint } from "slate-react/dist/utils/dom";
import { Subject } from "shared/Subject";
import {
	ItemType,
	Matrix,
	Mbr,
	Point,
	RichTextData,
	Transformation,
	TransformationOperation,
} from "..";
import { HorisontalAlignment, VerticalAlignment } from "../Alignment";
import { DrawingContext } from "../DrawingContext";
import { Geometry } from "../Geometry";
import { LinkTo } from "../LinkTo/LinkTo";
import { BlockNode, BlockType } from "./Editor/BlockNode";
import { TextNode, TextStyle } from "./Editor/TextNode";
import { EditorContainer } from "./EditorContainer";
import { findOptimalMaxWidthForTextAutoSize } from "./findOptimalMaxWidthForTextAutoSize";
import { getParagraph, getParagraphWithPassedTextNode } from "./getParagraph";
import { RichTextOperation } from "./RichTextOperations";
import { LayoutBlockNodes } from "./CanvasText/LayoutBlockNodes";
import { getBlockNodes } from "./CanvasText/Render";
import { decodeHtml } from "Board/parserHTML";
import { DocumentFactory } from "Board/api/DocumentFactory";
import { conf } from "Board/Settings";
const { i18n } = conf;
import { SessionStorage } from "App/SessionStorage";

export type DefaultTextStyles = {
	fontFamily: string;
	fontSize: number;
	fontColor: string;
	fontHighlight: string;
	lineHeight: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	"line-through": boolean;
	overline: boolean;
	subscript: boolean;
	superscript: boolean;
};

export const DEFAULT_TEXT_STYLES: DefaultTextStyles = {
	fontFamily: "Manrope",
	fontSize: 14,
	fontColor: "rgb(20, 21, 26)",
	fontHighlight: "",
	lineHeight: 1.4,
	bold: false,
	underline: false,
	italic: false,
	"line-through": false,
	overline: false,
	subscript: false,
	superscript: false,
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
	private layoutNodes: LayoutBlockNodes;
	private clipPath = new conf.path2DFactory();
	private updateRequired = false;
	private autoSizeScale = 1;
	private containerMaxWidth?: number;
	readonly linkTo: LinkTo;
	maxHeight: number;
	private selection?: BaseSelection;
	transformationRenderBlock?: boolean = undefined;
	lastClickPoint?: Point;
	initialFontColor?: string;
	frameMbr?: Mbr;
	private _onLimitReached: () => void = () => {};
	private shrinkWidth = false;
	isWidthResizing: boolean = false;

	constructor(
		private board: Board,
		public container: Mbr,
		private id = "",
		readonly transformation = new Transformation(id, board.events),
		linkTo?: LinkTo,
		public placeholderText = i18n.t("board.textPlaceholder"),
		public isInShape = false,
		private autoSize = false,
		public insideOf?: ItemType,
		private initialTextStyles: DefaultTextStyles = DEFAULT_TEXT_STYLES,
	) {
		super();
		this.linkTo = linkTo || new LinkTo(this.id, this.board.events);
		let textSizeFromStorage = new SessionStorage().getFontSize(
			insideOf || "RichText",
		);
		if (!textSizeFromStorage || textSizeFromStorage === "auto") {
			textSizeFromStorage = initialTextStyles.fontSize;
		}
		this.editor = new EditorContainer(
			id,
			this.emit,
			(op: RichTextOperation) => {
				this.emitWithoutApplying(op);
				// this.subject.publish(this);
			},
			(): void => {
				if (this.board.events) {
					// this.board.events.undo(false);
					this.board.events.undo();
				}
			},

			(): void => {
				if (this.board.events) {
					// this.board.events.redo(false);
					this.board.events.redo();
				}
			},
			this.getScale,
			this.getDefaultHorizontalAlignment(),
			initialTextStyles,
			textSizeFromStorage,
			this.isAutosize.bind(this),
			this.autosizeEnable.bind(this),
			this.autosizeDisable.bind(this),
			this.getFontSize.bind(this),
			this.getTransformationScale.bind(this),
			() => this.onLimitReached,
			this.calcAutoSize.bind(this),
			this.updateElement,
		);
		this.editor.subject.subscribe((_editor: EditorContainer) => {
			// this.updateElement();

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
					this.setAINodeShirkWidth();

					if (!this.isInShape) {
						this.transformCanvas();
					} else {
						this.updateElement();
					}
				} else if (op.method === "deserialize") {
					this.setAINodeShirkWidth();
					this.updateElement();
				}
			},
		);
		if (
			!insideOf ||
			insideOf === "RichText" ||
			insideOf === "Connector" ||
			insideOf === "AINode"
		) {
			this.shrinkWidth = true;
		}
		this.linkTo.subject.subscribe(() => {
			this.updateElement();
			this.subject.publish(this);
		});

		this.layoutNodes = getBlockNodes(
			this.getBlockNodes(),
			this.shrinkWidth && this.isEmpty()
				? Infinity
				: this.getMaxWidth() || 0,
			this.shrinkWidth,
			this.insideOf === "Frame",
		);

		if (
			this.shrinkWidth &&
			this.layoutNodes.width > (this.getMaxWidth() || 0)
		) {
			this.editor.applyMaxWidth(this.layoutNodes.width);
		}

		this.editorTransforms.select(this.editor.editor, {
			offset: 0,
			path: [0, 0],
		});
		this.setClipPath();
	}

	private setAINodeShirkWidth(): void {
		if (this.insideOf !== "AINode") {
			return;
		}
		this.shrinkWidth = true;
	}

	getBlockNodes(): BlockNode[] {
		if (!this.editor.isEmpty()) {
			return this.editor.getBlockNodes();
		} else {
			this.editor.selectWholeText();
			const firstTextNode = this.editor.getAllTextNodesInSelection()[0];
			if (firstTextNode && !this.autoSize) {
				const placeholderNode = structuredClone(firstTextNode);
				placeholderNode.text = this.placeholderText;
				return getParagraphWithPassedTextNode(placeholderNode);
			}
			return getParagraph(
				this.getFontStyles(),
				this.getFontColor(),
				this.isAutosize() ? 14 : this.getFontSize(),
				this.getFontFamily(),
				this.getDefaultHorizontalAlignment(),
				this.placeholderText,
			);
		}
	}

	getHyperLinkByPointerCoordinates(point: Point) {
		for (const link of this.layoutNodes.linkPositions) {
			const { link: hyperLink, left, right, bottom, top } = link;
			const mbr = new Mbr(left, top, right, bottom);
			if (this.insideOf === "AINode") {
				mbr.left += 20;
				mbr.top += 20;
				mbr.right += 20;
				mbr.bottom += 20;
			}
			const linkMbr = mbr.getTransformed(this.transformation.matrix);
			if (linkMbr.isUnderPoint(point)) {
				return { hyperLink, linkMbr };
			}
		}
		return undefined;
	}

	getDefaultHorizontalAlignment(): HorisontalAlignment {
		switch (this.insideOf) {
			case "Sticker":
			case "Connector":
			case "Shape":
				return "center";
			default:
				return "left";
		}
	}

	isEmpty(): boolean {
		return this.editor.isEmpty();
	}

	handleInshapeScale(): void {
		if (!this.isInShape) {
			return;
		}
		const maxWidth = this.getMaxWidth();
		const shouldUpdateLayout = this.getTextWidth() > (maxWidth || 0);
		if (shouldUpdateLayout) {
			this.updateElement();
			this.subject.publish(this);
		} else {
			this.transformCanvas();
			this.recoordinate(maxWidth);
		}
	}

	handleFocus = (): void => {
		isEditInProcessValue = true;
	};

	handleBlur = (): void => {
		this.selection = this.getCurrentSelection(); // Save current selection
		isEditInProcessValue = false;
		if (!this.selection) {
			return;
		}
		// TODO: Что-нибудь с этим сделать...
		try {
			ReactEditor.focus(this.editor.editor);
		} catch {}
	};

	updateElement = (): void => {
		// if (this.selection) {
		// 	Transforms.select(this.editor.editor, this.selection);
		// }
		if (this.updateRequired) {
			return;
		}
		this.updateRequired = true;
		if (this.autoSize) {
			this.calcAutoSize();
		} else {
			this.layoutNodes = getBlockNodes(
				this.getBlockNodes(),
				this.shrinkWidth && this.isEmpty()
					? Infinity
					: this.getMaxWidth() || 0,
				this.shrinkWidth,
				this.insideOf === "Frame",
			);
			if (this.isEmpty() && this.shrinkWidth) {
				if (this.layoutNodes.width > (this.getMaxWidth() || 0)) {
					this.editor.setMaxWidth(Math.ceil(this.layoutNodes.width));
				}
			}
			if (
				this.containerMaxWidth &&
				this.layoutNodes.width >= this.containerMaxWidth
			) {
				this.layoutNodes.width = this.containerMaxWidth;
			}
		}

		this.alignInRectangle(
			this.getTransformedContainer(),
			this.editor.verticalAlignment,
		);
		this.transformCanvas();
		this.subject.publish(this);

		this.updateRequired = false;
	};

	calcAutoSize(textNodes?: BlockNode[]): void {
		const nodes = textNodes ? textNodes : this.getBlockNodes();
		const container = this.getTransformedContainer();
		const containerWidth = container.getWidth();
		const containerHeight = container.getHeight();

		const optimal = findOptimalMaxWidthForTextAutoSize(
			nodes,
			containerWidth,
			containerHeight,
			containerWidth,
		);

		const textScale = Math.min(
			containerWidth / optimal.bestMaxWidth,
			containerHeight / optimal.bestMaxHeight,
		);

		this.layoutNodes = getBlockNodes(nodes, containerWidth / textScale);

		this.autoSizeScale = textScale;
		// this.maxWidth = maxWidth;
		this.maxHeight = containerHeight / textScale;
	}

	getTextWidth(): number {
		return this.layoutNodes.width;
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
		point: Point;
		width: number;
		height: number;
		maxWidth?: number;
		maxHeight?: number;
		textScale: number;
	} {
		let left = this.left;
		let top = this.top;
		const { width, height } = this.layoutNodes;
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
			const { width, height } = this.layoutNodes;
			this.container = new Mbr(0, 0, width, height);
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
		let width = this.layoutNodes.maxWidth;
		let height = this.layoutNodes.height;
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

		if (this.insideOf === "Sticker" || this.insideOf === "Shape") {
			this.left = rect.left;
			this.right = rect.right;
		}
	}

	setClipPath(): void {
		const container = this.getTransformedContainer();
		const width = container.getWidth();
		const height = container.getHeight();
		this.clipPath = new conf.path2DFactory();
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
		const shouldNotShrink =
			this.insideOf !== "RichText" &&
			this.insideOf !== "AINode" &&
			this.containerMaxWidth &&
			this.shrinkWidth;
		if (shouldNotShrink) {
			this.shrinkWidth = false;
		}
		this.containerMaxWidth = maxWidth;
		return this;
	}

	shouldShrink(): boolean {
		return this.shrinkWidth;
	}

	/**
	 * Get the container that would be used to align the CanvasDocument.
	 */
	getTransformedContainer(): Mbr {
		let matrix = this.transformation.matrix;
		if (this.insideOf === "Frame") {
			const scaleY = (this.getMbr().getHeight() * 2) / 10;
			matrix = new Matrix(
				matrix.translateX,
				matrix.translateY,
				matrix.scaleX,
				scaleY,
			);
		}
		return this.container.getTransformed(matrix);
	}

	emitWithoutApplying = (op: RichTextOperation): void => {
		if (this.board.events) {
			this.board.events.emit(op);
		}
		// this.updateElement();
	};

	emit = (op: RichTextOperation): void => {
		if (this.board.events) {
			this.board.events.emitAndApply(op);
		} else {
			this.apply(op);
		}
	};

	apply(op: Operation): void {
		switch (op.class) {
			case "Transformation":
				this.transformation.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			case "RichText":
				if (op.method === "setMaxWidth") {
					this.setMaxWidth(op.maxWidth ?? 0);
				} else if (op.method === "setFontSize") {
					if (op.fontSize === "auto") {
						this.autosizeEnable();
						this.applySelectionFontSize(14, op.context);
					} else {
						this.autosizeDisable();
						this.applySelectionFontSize(op.fontSize, op.context);
					}
				} else {
					this.selection = null;
					this.editor.applyRichTextOp(op);
				}
				this.updateElement();
				break;
			default:
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
		this.linkTo.setId(id);
		return this;
	}

	/** deprecated use getBlockNodes */
	getText(): Descendant[] {
		return this.editor.getText();
	}

	getTextString(): string {
		const getRows = (descendants: Descendant[]) => {
			const rows: string[] = [];
			for (const descendant of descendants) {
				if ("children" in descendant) {
					rows.push(...getRows(descendant.children));
				}
				if ("text" in descendant) {
					rows.push(descendant.text);
				}
			}

			return rows;
		};
		return getRows(this.getText()).join("\n");
	}

	getScale = (): number => {
		if (this.autoSize) {
			return this.autoSizeScale;
		}
		return this.transformation.getScale().x;
	};

	getTransformationScale = (): number => {
		return this.transformation.getScale().y;
	};

	get onLimitReached(): () => void {
		return this._onLimitReached;
	}

	set onLimitReached(handler: () => void) {
		this._onLimitReached = handler;
	}

	setSelectionFontColor(
		format: string,
		selectionContext?: SelectionContext,
	): SlateOp[] {
		if (selectionContext === "EditUnderPointer") {
			this.editor.selectWholeText();
		}
		const ops = this.editor.setSelectionFontColor(format, selectionContext);
		if (selectionContext !== "EditTextUnderPointer") {
			this.updateElement();
		}
		return ops;
	}

	setHyperLink(
		link: string | undefined,
		selection: BaseRange | null,
	): SlateOp[] {
		const ops = this.editor.setSelectionLink(link, selection);
		this.updateElement();

		return ops;
	}

	applySelectionFontColor(fontColor: string): void {
		this.editor.shouldEmit = false;
		this.editor.applySelectionFontColor(fontColor);
		this.editor.shouldEmit = true;
		this.updateElement();
	}

	setSelectionFontStyle(
		style: TextStyle | TextStyle[],
		selectionContext?: SelectionContext,
	): SlateOp[] {
		if (
			selectionContext === "EditUnderPointer" ||
			selectionContext === "SelectByRect"
		) {
			this.editor.selectWholeText();
		}
		const ops = this.editor.setSelectionFontStyle(style);
		this.updateElement();
		return ops;
	}

	applySelectionFontSize(
		fontSize: number,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.editor.selectWholeText();
		}
		this.editor.shouldEmit = false;
		if (this.isInShape) {
			this.editor.applySelectionFontSize(fontSize, selectionContext);
		} else {
			const scaledFontSize = fontSize / this.getScale();
			this.editor.applySelectionFontSize(
				scaledFontSize,
				selectionContext,
			);
		}
		this.editor.shouldEmit = true;
		this.updateElement();
	}

	setSelectionFontSize(
		fontSize: number | "auto",
		selectionContext?: SelectionContext,
	): SlateOp[] {
		if (selectionContext === "EditUnderPointer") {
			this.editor.selectWholeText();
		}
		const ops = this.editor.setSelectionFontSize(
			fontSize,
			selectionContext,
		);
		this.updateElement();
		return ops;
	}

	setSelectionFontHighlight(
		format: string,
		selectionContext?: SelectionContext,
	): SlateOp[] {
		if (selectionContext === "EditUnderPointer") {
			this.editor.selectWholeText();
		}
		const ops = this.editor.setSelectionFontHighlight(
			format,
			selectionContext,
		);
		if (selectionContext !== "EditTextUnderPointer") {
			this.updateElement();
		}
		return ops;
	}

	setPaddingTop(padding: number) {
		this.editor.setPaddingTop(padding);
	}

	setPaddingBottom(padding: number) {
		this.editor.setPaddingBottom(padding);
	}

	setEditorFocus(selectionContext?: SelectionContext): void {
		this.editor.setEditorFocus(selectionContext);
	}

	setSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
		selectionContext?: SelectionContext,
	): SlateOp[] {
		if (selectionContext === "EditUnderPointer") {
			this.editor.selectWholeText();
		}
		const ops = this.editor.setSelectionHorisontalAlignment(
			horisontalAlignment,
			selectionContext,
		);
		if (selectionContext !== "EditTextUnderPointer") {
			this.updateElement();
		}
		return ops;
	}

	applySetSelectionHorisontalAlignment(
		horisontalAlignment: HorisontalAlignment,
		selectionContext?: SelectionContext,
	): void {
		if (selectionContext === "EditUnderPointer") {
			this.editor.selectWholeText();
		}
		this.editor.setSelectionHorisontalAlignment(horisontalAlignment);
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

	// TODO exclude scale from font size calculation
	getFontSize(): number {
		const marks = this.editor.getSelectionMarks();
		const fontSize = marks?.fontSize ?? this.initialTextStyles.fontSize;
		if (this.autoSize) {
			return fontSize * this.autoSizeScale;
		}
		if (this.isInShape) {
			return fontSize;
		}

		return fontSize * this.transformation.getScale().x;
	}

	getMinFontSize(): number {
		const textNodes = Editor.nodes(this.editor.editor, {
			match: n => Text.isText(n),
			at: [],
		});

		const fontSizes: number[] = [];
		for (const [node] of textNodes) {
			const fontSize = node.fontSize || (node && node.fontSize);
			if (fontSize) {
				fontSizes.push(fontSize);
			}
		}

		if (fontSizes.length > 0) {
			return Math.min(...fontSizes);
		}

		return this.initialTextStyles.fontSize;
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

		if (blockNode && "horisontalAlignment" in blockNode) {
			return blockNode.horisontalAlignment;
		}
		return "center";
	}

	getVerticalAlignment(): VerticalAlignment {
		return this.editor.verticalAlignment;
	}

	saveLastClickPoint(point: Point, camera: Camera): void {
		point.transform(camera.getMatrix());
		this.lastClickPoint = point;
	}

	getLastClickPoint(): Point {
		return this.lastClickPoint?.copy() || new Point(0, 0);
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
				refMbr.isInside(point) &&
				(conf.documentFactory.caretPositionFromPoint ||
					conf.documentFactory.caretRangeFromPoint)
			) {
				const domRange = conf.documentFactory.caretPositionFromPoint
					? conf.documentFactory.caretPositionFromPoint(
							point.x,
							point.y,
						)
					: conf.documentFactory.caretRangeFromPoint(
							point.x,
							point.y,
						);
				// @ts-expect-error: Suppress TS error for non-existent method
				const textNode = conf.documentFactory.caretPositionFromPoint
					? domRange.offsetNode
					: domRange.startContainer;
				// @ts-expect-error: Suppress TS error for non-existent method
				const offset = conf.documentFactory.caretPositionFromPoint
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
						conf.documentFactory.caretPositionFromPoint ||
						conf.documentFactory.caretRangeFromPoint
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
			linkTo: this.linkTo.serialize(),
		};
	}

	getCurrentSelection(): BaseSelection | undefined {
		const { selection } = this.editor.editor;
		if (selection) {
			return selection;
		}
	}

	restoreSelection(selection?: BaseSelection): void {
		if (selection) {
			Transforms.select(this.editor.editor, selection);
		} else {
			Transforms.deselect(this.editor.editor);
		}
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
		this.linkTo.deserialize(data.linkTo);
		this.insideOf = data.insideOf;
		if (typeof document !== "undefined") {
			document.fonts.ready.then(() => {
				this.updateElement();
			});
		}
		this.subject.publish(this);
		return this;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.selection = null;
		const shouldRender =
			this.isRenderEnabled &&
			(this.getTextString().length > 0 || this.insideOf === "Frame");
		if (!shouldRender) {
			return;
		}
		const { ctx } = context;
		ctx.save();
		ctx.translate(this.left, this.top);

		const shouldScale = !this.isInShape && !this.autoSize;
		if (shouldScale) {
			const { scaleX, scaleY } = this.transformation.matrix;
			ctx.scale(scaleX, scaleY);
		}
		const shouldClip =
			this.insideOf === "Shape" || this.insideOf === "Sticker";
		if (shouldClip) {
			ctx.clip(this.clipPath.nativePath);
		}
		const autoSizeScale = this.autoSize ? this.autoSizeScale : undefined;
		this.layoutNodes.render(ctx, autoSizeScale);
		ctx.restore();
	}

	renderHTML(
		documentFactory: DocumentFactory,
		enablePlaceholder = true,
	): HTMLElement {
		const renderNode = (node: Descendant): HTMLElement => {
			if (node.type === "text" || "text" in node) {
				node = node as TextNode;
				const text =
					node.text.trim() !== ""
						? decodeHtml(escapeHtml(node.text))
						: "\u00A0";

				const textElement = node.link
					? Object.assign(conf.documentFactory.createElement("a"), {
							href: node.link,
							target: "_blank",
							rel: "noreferrer",
						})
					: conf.documentFactory.createElement("span");

				Object.assign(textElement.style, {
					fontWeight: node.bold ? "700" : "400",
					fontStyle: node.italic ? "italic" : "",
					textDecoration: [
						node.underline ? "underline" : "",
						node["line-through"] ? "line-through" : "",
					]
						.filter(Boolean)
						.join(" "),
					color: node.fontColor || DEFAULT_TEXT_STYLES.fontColor,
					backgroundColor:
						node.fontHighlight || DEFAULT_TEXT_STYLES.fontHighlight,
					fontSize: node.fontSize
						? `${node.fontSize}px`
						: `${DEFAULT_TEXT_STYLES.fontSize}px`,
					fontFamily:
						node.fontFamily || DEFAULT_TEXT_STYLES.fontFamily,
				});

				if (this.insideOf === "Frame") {
					Object.assign(textElement.style, {
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
						display: "inline-block",
						width: "100%",
					});
				}

				textElement.textContent = text;
				return textElement;
			}

			if (Element.isElement(node)) {
				const children = node.children.map(renderNode);
				const applyCommonStyles = (el: HTMLElement) => {
					el.style.textAlign = node.horisontalAlignment || "left";
					el.style.paddingTop = node.paddingTop
						? `${node.paddingTop}px`
						: "";
					el.style.paddingBottom = node.paddingBottom
						? `${node.paddingBottom}px`
						: "";
				};

				switch (node.type) {
					case "heading_one":
					case "heading_two":
					case "heading_three":
					case "heading_four":
					case "heading_five": {
						const level = node.type.split("_")[1];
						const levels = {
							one: 1,
							two: 2,
							three: 3,
							four: 4,
							five: 5,
						} as const;
						const header = conf.documentFactory.createElement(
							`h${levels[level]}`,
						);
						applyCommonStyles(header);
						header.append(...children);
						return header;
					}

					case "code_block": {
						const pre = conf.documentFactory.createElement("pre");
						const code = conf.documentFactory.createElement("code");
						applyCommonStyles(pre);
						if (node.language) {
							code.classList.add(`language-${node.language}`);
						}
						code.append(...children);
						pre.append(code);
						Object.assign(pre.style, {
							fontFamily: "monospace",
							whiteSpace: "pre-wrap",
						});
						return pre;
					}

					case "block-quote": {
						const blockquote =
							conf.documentFactory.createElement("blockquote");
						applyCommonStyles(blockquote);
						blockquote.append(...children);
						return blockquote;
					}

					case "ul_list": {
						const ul = conf.documentFactory.createElement("ul");
						applyCommonStyles(ul);
						ul.append(...children);
						return ul;
					}

					case "ol_list": {
						const ol = conf.documentFactory.createElement("ol");
						applyCommonStyles(ol);
						ol.append(...children);
						return ol;
					}

					case "list_item": {
						const li = conf.documentFactory.createElement("li");
						applyCommonStyles(li);
						li.append(...children);
						return li;
					}

					case "paragraph":
					default: {
						const par = conf.documentFactory.createElement("p");
						applyCommonStyles(par);
						Object.assign(par.style, {
							lineHeight: node.lineHeight
								? `${node.lineHeight}`
								: DEFAULT_TEXT_STYLES.lineHeight,
							margin: "0",
						});
						par.append(...children);
						return par;
					}
				}
			}

			return conf.documentFactory.createElement("div");
		};

		const escapeHtml = (unsafe: string): string => {
			return unsafe
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#039;");
		};

		// const elements = enablePlaceholder
		// ? this.getBlockNodes().map(renderNode)
		// : this.editor.editor.children.map(renderNode);
		const elements = this.editor.editor.children.map(renderNode);

		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;

		const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

		const transformedWidth = this.getTransformedContainer().getWidth();
		const transformedHeight = this.getTransformedContainer().getHeight();

		const div = documentFactory.createElement("rich-text");
		div.id = this.getId();
		div.style.width = `${transformedWidth + 5}px`;
		div.style.height = `${transformedHeight}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";
		div.style.overflow = "hidden";
		div.style.overflowWrap = "break-word";
		div.style.maxWidth = this.getMaxWidth()
			? `${this.getMaxWidth()}px`
			: "";
		// if (this.layoutNodes.height < transformedHeight) {
		// 	const alignment = this.getVerticalAlignment();
		// 	if (alignment === "center") {
		// 		div.style.marginTop = `${(transformedHeight - this.layoutNodes.height) / 2 / scaleY}px`;
		// 	} else if (alignment === "bottom") {
		// 		div.style.marginTop = `${(transformedHeight - this.layoutNodes.height) / scaleY}px`;
		// 	}
		// }

		div.setAttribute(
			"data-vertical-alignment",
			this.getVerticalAlignment(),
		);
		div.setAttribute(
			"data-horizontal-alignment",
			this.getHorisontalAlignment() || "left",
		);
		div.setAttribute("data-placeholder-text", this.placeholderText);
		div.setAttribute(
			"data-real-size",
			this.autoSize ? "auto" : this.getFontSize().toString(),
		);
		div.setAttribute("data-link-to", this.linkTo.serialize() || "");

		if (
			this.getLinkTo() &&
			(this.insideOf === "RichText" || !this.insideOf)
		) {
			const linkElement = this.linkTo.renderHTML(documentFactory);
			scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
			translateElementBy(
				linkElement,
				(this.getMbr().getWidth() - parseInt(linkElement.style.width)) /
					scaleX,
				0,
			);
			div.appendChild(linkElement);
		}

		div.append(...elements);

		return div;
	}

	getClipMbr(): Mbr {
		const mbr = this.getMbr();
		const center = mbr.getCenter();
		const { width } = this.layoutNodes;
		mbr.left = center.x - width / 2;
		mbr.right = mbr.left + width;
		return mbr;
	}

	autosizeEnable(): void {
		this.autoSize = true;
		this.isInShape = false;
	}

	autosizeDisable(): void {
		this.autoSize = false;
		this.autoSizeScale = 1;
		if (
			this.insideOf &&
			this.insideOf !== "RichText" &&
			this.insideOf !== "AINode"
		) {
			this.isInShape = true;
		}
	}

	isAutosize(): boolean {
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
		const realignWidth =
			this.getMaxWidth() || this.getTransformedContainer().getWidth();
		this.layoutNodes.realign(realignWidth);
	}

	recoordinate(newMaxWidth?: number): void {
		this.layoutNodes.recoordinate(newMaxWidth);
	}

	hasWraps(): boolean {
		if (Array.isArray(this.layoutNodes.nodes)) {
			return this.layoutNodes.nodes.some(
				node => node.height > node.lineHeight * this.getFontSize(),
			);
		} else {
			console.warn("layoutNodes.nodes is not an array");
			return false;
		}
	}

	getMaxFontSize(): number {
		const marks = this.editor.getSelectionMarks();
		const fontSize = marks?.fontSize ?? this.initialTextStyles.fontSize;
		if (fontSize === "auto") {
			return 14; // should not get here
		}
		return fontSize * this.autoSizeScale;
	}

	getRichText(): RichText {
		return this;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}
}
