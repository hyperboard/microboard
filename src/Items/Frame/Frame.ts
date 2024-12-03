import {
	Mbr,
	Line,
	Point,
	Transformation,
	Path,
	Paths,
	Item,
	RichText,
	Matrix,
} from "..";
import { Geometry } from "../Geometry";
import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { Events, Operation } from "Board/Events";
import { FrameData, FrameOperation } from "./FrameOperation";
import { Frames, FrameType } from "./Basic";
import { GeometricNormal } from "../GeometricNormal";
import { FrameCommand } from "./FrameCommand";
import {
	getProportionalResize,
	getResize,
} from "Board/Selection/Transformer/getResizeMatrix";
import { ResizeType } from "Board/Selection/Transformer/getResizeType";
import { Board } from "Board/Board";
import {
	exportBoardSnapshot,
	SnapshotInfo,
} from "Board/Tools/ExportSnapshot/exportBoardSnapshot";
import { FRAME_TITLE_COLOR } from "View/Items/Frame";
import { DEFAULT_TEXT_STYLES } from "View/Items/RichText";
import { LinkTo } from "../LinkTo/LinkTo";
const defaultFrameData = new FrameData();

export class Frame implements Geometry {
	readonly itemType = "Frame";
	parent = "Board";
	readonly transformation: Transformation;
	readonly subject = new Subject<Frame>();
	private textContainer: Mbr;
	private path: Path;
	private children: string[] = [];
	private mbr: Mbr = new Mbr();
	readonly linkTo: LinkTo;
	readonly text: RichText;
	private canChangeRatio = true;
	newShape: FrameType | null = null;
	transformationRenderBlock?: boolean = undefined;
	private board?: Board;

	constructor(
		private getItemById: (id: string) => Item | undefined,
		private events?: Events,
		private id = "",
		private name = "",
		private shapeType = defaultFrameData.shapeType,
		private backgroundColor = defaultFrameData.backgroundColor,
		private backgroundOpacity = defaultFrameData.backgroundOpacity,
		private borderColor = defaultFrameData.borderColor,
		private borderOpacity = defaultFrameData.borderOpacity,
		private borderStyle = defaultFrameData.borderStyle,
		private borderWidth = defaultFrameData.borderWidth,
	) {
		this.textContainer = Frames[this.shapeType].textBounds.copy();
		this.path = Frames[this.shapeType].path.copy();
		this.transformation = new Transformation(this.id, this.events);
		this.linkTo = new LinkTo(this.id, this.events);

		this.text = new RichText(
			this.textContainer,
			this.id,
			this.events,
			this.transformation,
			this.linkTo,
			this.name,
			true,
			false,
			"Frame",
			{ ...DEFAULT_TEXT_STYLES, fontColor: FRAME_TITLE_COLOR },
		);
		this.text.setSelectionHorisontalAlignment("left");
		this.transformation.subject.subscribe(() => {
			this.transformPath();
			this.updateMbr();
			this.text.transformCanvas();
			this.subject.publish(this);
		});
		this.text.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
		this.linkTo.subject.subscribe(() => {
			this.updateMbr();
			this.subject.publish(this);
		});
	}

	setBoard(board: Board) {
		this.board = board;

		return this;
	}

	/** Sets parent of child and emits add child message */
	emitAddChild(child: Item): void {
		this.addChild(child.getId());
		child.parent = this.getId();
	}

	emitRemoveChild(child: Item): void {
		this.removeChild(child.getId());
		child.parent = "Board";
	}

	emitNesting(child: Item): boolean {
		if (this.handleNesting(child)) {
			this.emitAddChild(child);
			return true;
		} else {
			this.emitRemoveChild(child);
			return false;
		}
	}

	/**
	 * Parent cant be child,
	 * Child cant be itself,
	 * frame cant be child
	 */
	private addChild(childId: string): void {
		this.emit({
			class: "Frame",
			method: "addChild",
			item: [this.getId()],
			childId,
		});
	}

	private applyAddChild(childId: string): void {
		if (
			this.parent !== childId &&
			// && child.itemType !== "Frame"
			this.getId() !== childId
		) {
			const foundItem = this.getItemById(childId);
			if (!this.children.includes(childId) && foundItem) {
				this.children.push(childId);
				foundItem.parent = this.getId();
				this.updateMbr();
				this.subject.publish(this);
			} else if (!foundItem) {
				console.warn(`Could not find child with id ${childId}`);
			}
		}
	}

	private applyRemoveChild(childId: string): void {
		this.children = this.children.filter(
			currChild => currChild !== childId,
		);
		this.subject.publish(this);
	}

	private removeChild(childId: string): void {
		this.emit({
			class: "Frame",
			method: "removeChild",
			item: [this.getId()],
			childId,
		});
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}

	/**
	 * Returns:
	 * true - if can be child of the frame
	 * false - if outside of the frame
	 */
	handleNesting(
		item: Item | Mbr,
		options?: {
			onlyForOut?: boolean;
			cancelIfChild?: boolean;
		},
	): boolean {
		const isItem = "itemType" in item;
		const itemMbr = isItem ? item.getMbr() : item;
		if (item instanceof Frame) {
			return false;
		}
		if (options?.cancelIfChild && isItem && item.parent !== "Board") {
			return false;
		}

		const frameMbr = this.getMbr().copy();
		if (item.isEnclosedOrCrossedBy(frameMbr)) {
			if (frameMbr.isInside(itemMbr.getCenter())) {
				if (!options || !options.onlyForOut) {
					return true;
				}
			}
		}
		return false;
	}

	private initPath(): void {
		this.path = Frames[this.shapeType].path.copy();
		this.textContainer = Frames[this.shapeType].textBounds.copy();
		this.text.setContainer(this.textContainer.copy());
		this.text.updateElement();
	}

	getPaths(): Path | Paths {
		return this.path;
	}

	getPath(): Path | Paths {
		return this.path.copy();
	}

	copyPaths(): Path | Paths {
		return this.path.copy();
	}

	isTextUnderPoint(point: Point): boolean {
		return this.text.isUnderPoint(point);
	}

	getUnderPoint(point: Point): boolean {
		return this.path.isUnderPoint(point) || this.isTextUnderPoint(point);
	}

	isClosed(): boolean {
		return this.path instanceof Path && this.path.isClosed();
	}

	setId(id: string): this {
		this.id = id;
		this.text.setId(id);
		this.transformation.setId(id);
		this.linkTo.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	getChildrenIds(): string[] {
		return this.children;
	}

	updateMbr(): void {
		const rect = this.path.getMbr();
		this.mbr = rect;
	}

	getMbr(): Mbr {
		return this.mbr;
	}

	doResize(
		resizeType: ResizeType,
		pointer: Point,
		mbr: Mbr,
		opposite: Point,
		startMbr: Mbr,
		timeStamp: number,
	): { matrix: Matrix; mbr: Mbr } | boolean {
		if (this.transformation.isLocked) {
			this.board?.pointer.setCursor("default");
			return false;
		}

		const proportional =
			resizeType === "leftBottom" ||
			resizeType === "leftTop" ||
			resizeType === "rightBottom" ||
			resizeType === "rightTop";

		const res = proportional
			? getProportionalResize(resizeType, pointer, mbr, opposite)
			: this.getCanChangeRatio()
				? getResize(resizeType, pointer, mbr, opposite)
				: null;

		if (!res) {
			return {
				matrix: this.transformation.matrix,
				mbr: this.getMbr(),
			};
		}

		let { scaleX, scaleY, translateX, translateY } = res.matrix;
		const thisMbr = this.getMbr();
		const initMbr = Frames[this.shapeType].path.copy().getMbr();

		if (
			this.mbr.right - this.mbr.left < initMbr.getWidth() &&
			res.matrix.scaleX < 1
		) {
			scaleX = 1;
			translateX = 0;
		} else if (proportional) {
			const deltaX = thisMbr.left - thisMbr.left;
			translateX =
				deltaX * res.matrix.scaleX - deltaX + res.matrix.translateX;
		}

		if (
			this.mbr.bottom - this.mbr.top < initMbr.getHeight() &&
			res.matrix.scaleY < 1
		) {
			scaleY = 1;
			translateY = 0;
		} else if (proportional) {
			const deltaY = thisMbr.top - thisMbr.top;
			translateY =
				deltaY * res.matrix.scaleY - deltaY + res.matrix.translateY;
		}

		this.transformation.scaleByTranslateBy(
			{
				x: scaleX,
				y: scaleY,
			},
			{
				x: translateX,
				y: translateY,
			},
			timeStamp,
		);

		this.setLastFrameScale();
		res.mbr = this.getMbr();
		return res;
	}

	getLastFrameScale(): { x: number; y: number } {
		const scaleString = localStorage.getItem("lastFrameScale");
		return scaleString ? JSON.parse(scaleString) : { x: 4, y: 5.565 };
	}

	scaleLikeLastFrame(): void {
		const scale = this.getLastFrameScale();
		this.transformation.scaleTo(scale.x, scale.y);
	}

	setLastFrameScale(): void {
		const aspectRatios = {
			A4: { x: 1, y: 1.41 },
			Letter: { x: 1, y: 1.29 },
			Frame16x9: { x: 1.78, y: 1 },
			Frame4x3: { x: 1.33, y: 1 },
			Frame1x1: { x: 1, y: 1 },
			Custom: { x: 1, y: 1 },
		};
		const proportionalScale = {
			x:
				this.transformation.getScale().x *
				aspectRatios[this.getFrameType()].x,
			y:
				this.transformation.getScale().y *
				aspectRatios[this.getFrameType()].y,
		};
		localStorage.setItem(
			"lastFrameScale",
			JSON.stringify(proportionalScale),
		);
	}

	serialize(): FrameData {
		return {
			itemType: "Frame",
			shapeType: this.shapeType,
			backgroundColor: this.backgroundColor,
			backgroundOpacity: this.backgroundOpacity,
			borderColor: this.borderColor,
			borderOpacity: this.borderOpacity,
			borderStyle: this.borderStyle,
			borderWidth: this.borderWidth,
			transformation: this.transformation.serialize(),
			children: this.children,
			text: this.text.serialize(),
			canChangeRatio: this.canChangeRatio,
			linkTo: this.linkTo.serialize(),
		};
	}

	deserialize(data: Partial<FrameData>): this {
		if (data.shapeType) {
			this.shapeType = data.shapeType ?? this.shapeType;
			this.initPath();
		}
		this.linkTo.deserialize(data.linkTo);
		this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
		this.backgroundOpacity =
			data.backgroundOpacity ?? this.backgroundOpacity;
		this.borderColor = data.borderColor ?? this.borderColor;
		this.borderOpacity = data.borderOpacity ?? this.borderOpacity;
		this.borderStyle = data.borderStyle ?? this.borderStyle;
		this.borderWidth = data.borderWidth ?? this.borderWidth;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
			this.transformPath();
		}
		if (data.children) {
			data.children.forEach(child => {
				this.applyAddChild(child);
			});
		}
		if (data.text) {
			this.text.deserialize(data.text);
		}
		this.canChangeRatio = data.canChangeRatio ?? this.canChangeRatio;
		this.subject.publish(this);
		return this;
	}

	getSavedProportionsMatrix(): Matrix {
		const newScale = Math.min(
			this.transformation.matrix.scaleX,
			this.transformation.matrix.scaleY,
		);
		const newMatrix = this.transformation.matrix.copy();
		newMatrix.scaleX = newScale;
		newMatrix.scaleY = newScale;
		return newMatrix;
	}

	private transformPath(saveProportions = false): void {
		this.path = Frames[this.shapeType].path.copy();
		this.textContainer = Frames[this.shapeType].textBounds.copy();
		if (saveProportions) {
			const newMatrix = this.getSavedProportionsMatrix();
			this.path.transform(newMatrix);
			this.textContainer.transform(newMatrix);
			this.transformation.applyScaleTo(
				newMatrix.scaleX,
				newMatrix.scaleY,
			);
		} else {
			this.path.transform(this.transformation.matrix);
			this.textContainer.transform(this.transformation.matrix);
		}

		// TODO fix text container Y translation
		// const scaleY = this.transformation.getScale().y;
		// const offsetY = (this.textContainer.top - this.getMbr().top) / scaleY;
		// const textMatrix = new Matrix(
		// 	0,
		// 	offsetY,
		// 	1,
		// 	1,
		// );
		// console.log(this.transformation.getScale().y);
		// this.text.setContainer(Frames[this.shapeType].textBounds.copy().getTransformed(textMatrix));

		this.path.setBackgroundColor(this.backgroundColor);
		this.path.setBackgroundOpacity(this.backgroundOpacity);
		this.path.setBorderColor(this.borderColor);
		this.path.setBorderWidth(this.borderWidth);
		this.path.setBorderStyle(this.borderStyle);
		this.path.setBorderOpacity(this.borderOpacity);
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Frame":
				if (op.method === "setBackgroundColor") {
					this.applyBackgroundColor(op.backgroundColor);
				} else if (op.method === "setCanChangeRatio") {
					this.applyCanChangeRatio(op.canChangeRatio);
				} else if (op.method === "setFrameType") {
					this.applyFrameType(op.shapeType);
				} else if (op.method === "addChild") {
					this.applyAddChild(op.childId);
				} else if (op.method === "removeChild") {
					this.applyRemoveChild(op.childId);
				}
				break;
			case "RichText":
				this.text.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			default:
				return;
		}
		this.subject.publish(this);
	}

	emit(operation: FrameOperation): void {
		if (this.events) {
			const command = new FrameCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.path.getNearestEdgePointTo(point);
	}

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	isUnderPoint(point: Point): boolean {
		return this.path.isUnderPoint(point);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return this.path.isEnclosedOrCrossedBy(rect);
	}

	isEnclosedBy(rect: Mbr): boolean {
		return this.getMbr().isEnclosedBy(rect);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	getSnapAnchorPoints(): Point[] {
		const anchorPoints = Frames[this.shapeType].anchorPoints;
		const points: Point[] = [];
		for (const anchorPoint of anchorPoints) {
			points.push(anchorPoint.getTransformed(this.transformation.matrix));
		}
		return points;
	}

	getNormal(point: Point): GeometricNormal {
		return this.path.getNormal(point);
	}

	getIntersectionPoints(segment: Line): Point[] {
		const lines = this.getMbr().getLines();
		const initPoints: Point[] = [];
		const points = lines.reduce((acc, line) => {
			const intersections = line.getIntersectionPoints(segment);
			if (intersections.length > 0) {
				acc.push(...intersections);
			}
			return acc;
		}, initPoints);
		return points;
	}

	getFrameType(): FrameType {
		return this.shapeType;
	}

	private applyFrameType(shapeType: FrameType): void {
		this.shapeType = shapeType;
		if (shapeType !== "Custom") {
			this.setLastFrameScale();
		}
		if (this.newShape === "Custom" || shapeType === "Custom") {
			const scale = this.getLastFrameScale();
			this.transformation.applyScaleTo(scale.x, scale.y);
			this.transformPath(false);
		} else {
			this.transformPath(true);
		}

		if (this.board) {
			this.getChildrenIds().forEach(childId => {
				const child = this.board?.items.getById(childId);
				if (child) {
					if (this.handleNesting(child)) {
						this.applyAddChild(child.getId());
						child.parent = this.getId();
					} else {
						this.applyRemoveChild(child.getId());
						child.parent = "Board";
					}
					// this.handleNesting(child);
				}
			});
			const currMbr = this.getMbr();
			this.board.items
				.getEnclosedOrCrossed(
					currMbr.left,
					currMbr.top,
					currMbr.right,
					currMbr.bottom,
				)
				.forEach(item => {
					if (item.parent === "Board") {
						if (this.handleNesting(item)) {
							this.applyAddChild(item.getId());
							item.parent = this.getId();
						}
					}
				});
			this.board.fitMbrInView(this.getMbr());
		}
		this.updateMbr();
	}

	setFrameType(shapeType: FrameType): void {
		this.emit({
			class: "Frame",
			method: "setFrameType",
			item: [this.getId()],
			shapeType,
			prevShapeType: this.getFrameType(),
		});
	}

	getCanChangeRatio(): boolean {
		return this.canChangeRatio;
	}

	private applyCanChangeRatio(canChangeRatio: boolean): void {
		this.canChangeRatio = canChangeRatio;
	}

	setCanChangeRatio(canChangeRatio: boolean): void {
		this.emit({
			class: "Frame",
			method: "setCanChangeRatio",
			item: [this.getId()],
			canChangeRatio,
		});
	}

	getBorderColor(): string {
		return this.borderColor;
	}

	getBorderWidth(): number {
		return this.borderWidth;
	}

	getBackgroundColor(): string {
		return this.backgroundColor;
	}

	setNewShape(type: FrameType | null): void {
		this.newShape = type;
		this.subject.publish(this);
	}

	private applyBackgroundColor(backgroundColor: string): void {
		this.backgroundColor = backgroundColor;
		this.path.setBackgroundColor(backgroundColor);
	}

	setBackgroundColor(backgroundColor: string): void {
		this.emit({
			class: "Frame",
			method: "setBackgroundColor",
			item: [this.getId()],
			backgroundColor,
		});
	}

	getExportName(): string {
		return this.text
			.getText()
			.flatMap(el => (el.type === "paragraph" ? el.children : []))
			.map(child => (child.type === "text" ? child.text : ""))
			.join(" ");
	}

	export(
		board: Board,
		name: string = this.getExportName(),
	): Promise<SnapshotInfo> {
		return exportBoardSnapshot({
			board,
			nameToExport: name,
			selection: this.getMbr(),
			upscaleTo: 4000,
		});
	}

	getLink() {
		return `${window.location.origin}${
			window.location.pathname
		}?focus=${this.getId()}`;
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.path.render(context);
		this.text.render(context);
	}

	renderName(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.text.render(context);
	}

	renderBorders(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		const copy = this.getPath();
		copy.setBackgroundColor("none");
		copy.render(context);
	}

	renderPath(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.path.render(context);
		this.renderNewShape(context);
	}

	renderNewShape(context: DrawingContext): void {
		if (this.newShape) {
			const nMbr = Frames[this.newShape].path.copy().getMbr();
			const nMatrix = this.getSavedProportionsMatrix();
			if (this.newShape === "Custom") {
				const scale = this.getLastFrameScale();
				nMatrix.scaleX = scale.x;
				nMatrix.scaleY = scale.y;
			}
			nMbr.transform(nMatrix);
			nMbr.backgroundColor = "rgba(173, 216, 230, 0.25)";
			nMbr.render(context);
		}
	}

	getRichText(): RichText {
		return this.text;
	}
}
