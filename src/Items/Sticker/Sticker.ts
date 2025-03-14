import { Operation } from "Board/Events";
import { Subject } from "shared/Subject";
import {
	Line,
	Matrix,
	Mbr,
	Path,
	Paths,
	Point,
	Transformation,
	TransformationOperation,
} from "..";
import { getProportionalResize } from "../../Selection/Transformer/getResizeMatrix";
import { ResizeType } from "../../Selection/Transformer/getResizeType";
import { DrawingContext } from "../DrawingContext";
import { GeometricNormal } from "../GeometricNormal";
import { Geometry } from "../Geometry";
import { RichText } from "../RichText";
import { StickerCommand } from "./StickerCommand";
import { StickerData, StickerOperation } from "./StickerOperation";
import { LinkTo } from "../LinkTo/LinkTo";
import {
	positionRelatively,
	resetElementScale,
	scaleElementBy,
	translateElementBy,
} from "Board/HTMLRender";
import { SessionStorage } from "App/SessionStorage";
import { Board } from "Board";
import { DocumentFactory } from "Board/api/DocumentFactory";

export const stickerColors = {
	Purple: "rgb(233, 208, 255)",
	Pink: "rgb(255, 209, 211)",
	"Sky Blue": "rgb(206, 228, 255)",
	Blue: "rgb(205, 250, 255)",
	Green: "rgb(203, 232, 150)",
	"Light Green": "rgb(180, 241, 198)",
	Orange: "rgb(255, 180, 126)",
	Yellow: "rgb(255, 235, 163)",
	"Light Gray": "rgb(231, 232, 238)",
	Gray: "rgb(156, 156, 156)",
} as { [color: string]: string };

const width = 200;
const height = 200;

export const StickerShape = {
	textBounds: new Mbr(6.67, 6.67, width - 6.67, height - 6.67),
	stickerPath: new Path(
		[
			new Line(new Point(0, 0), new Point(width, 0)),
			new Line(new Point(width, 0), new Point(width, height)),
			new Line(new Point(width, height), new Point(0, height)),
			new Line(new Point(0, height), new Point(0, 0)),
		],
		true,
		stickerColors["Sky Blue"],
		"transparent",
		"solid",
		0,
	),
	anchorPoints: [
		new Point(width / 2, 0),
		new Point(width, height / 2),
		new Point(width / 2, height),
		new Point(0, height / 2),
	],
	DEFAULTS: [width, height],
};

const defaultStickerData = new StickerData();
const _hypotenuse = Math.sqrt(height * height + width * width);
const _relation = width / height;

export class Sticker implements Geometry {
	parent = "Board";
	readonly itemType = "Sticker";
	readonly transformation: Transformation;
	readonly linkTo: LinkTo;
	private stickerPath = StickerShape.stickerPath.copy();
	private textContainer = StickerShape.textBounds.copy();
	text: RichText;
	readonly subject = new Subject<Sticker>();
	transformationRenderBlock?: boolean = undefined;

	constructor(
		private board: Board,
		private id = "",
		private backgroundColor = defaultStickerData.backgroundColor,
	) {
		this.linkTo = new LinkTo(this.id, this.board.events);
		this.transformation = new Transformation(this.id, this.board.events);
		this.text = new RichText(
			board,
			this.textContainer,
			this.id,
			this.transformation,
			this.linkTo,
			"\u00A0",
			false,
			true,
			this.itemType,
		);

		this.transformation.subject.subscribe(
			(_subject: Transformation, op: TransformationOperation) => {
				this.transformPath();
				if (op.method === "scaleBy") {
					this.text.updateElement();
				} else if (op.method === "scaleByTranslateBy") {
					if (this.text.isAutosize()) {
						this.text.scaleAutoSizeScale(
							Math.min(op.scale.x, op.scale.y),
						);
						this.text.recoordinate();
						this.text.transformCanvas();
					} else {
						this.text.handleInshapeScale();
					}
				} else if (op.method === "transformMany") {
					const transformOp = op.items[this.id];
					if (transformOp.method === "scaleByTranslateBy") {
						if (this.text.isAutosize()) {
							this.text.scaleAutoSizeScale(
								Math.min(
									transformOp.scale.x,
									transformOp.scale.y,
								),
							);
							this.text.recoordinate();
							this.text.transformCanvas();
						} else {
							this.text.handleInshapeScale();
						}
					}
				}
				this.subject.publish(this);
			},
		);
		this.text.subject.subscribe(() => {
			this.subject.publish(this);
		});
		this.linkTo.subject.subscribe(() => {
			this.transformPath();
			this.subject.publish(this);
		});
		this.text.updateElement();
	}

	emit(operation: StickerOperation): void {
		if (this.board.events) {
			const command = new StickerCommand([this], operation);
			command.apply();
			this.board.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	saveStickerData() {
		const storage = new SessionStorage();
		storage.setStickerData(this.serialize());
	}

	serialize(): StickerData {
		return {
			itemType: "Sticker",
			backgroundColor: this.backgroundColor,
			transformation: this.transformation.serialize(),
			text: this.text.serialize(),
			linkTo: this.linkTo.serialize(),
		};
	}

	deserialize(data: Partial<StickerData>): this {
		this.backgroundColor = data.backgroundColor ?? this.backgroundColor;
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		if (data.text) {
			this.text.deserialize(data.text);
		}
		this.text.updateElement();
		const linkTo = data.linkTo;
		if (linkTo) {
			this.linkTo.deserialize(
				typeof linkTo === "string" ? linkTo : linkTo.link,
			);
		}
		// this.transformPath();
		this.subject.publish(this);
		return this;
	}

	private transformPath(): void {
		this.stickerPath = StickerShape.stickerPath.copy();
		this.textContainer = StickerShape.textBounds.copy();
		const matrix = this.transformation.matrix;
		this.stickerPath.transform(matrix);
		this.text.setContainer(this.textContainer.copy());
		this.textContainer.transform(this.transformation.matrix);
		// this.text.setContainer(this.textContainer);
		this.stickerPath.setBackgroundColor(this.backgroundColor);
		this.saveStickerData();
	}

	setId(id: string): this {
		this.id = id;
		this.text.setId(id);
		this.linkTo.setId(id);
		this.transformation.setId(id);
		return this;
	}

	getId(): string {
		return this.id;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "Sticker":
				switch (op.method) {
					case "setBackgroundColor":
						this.applyBackgroundColor(op.backgroundColor);
						break;
				}
				break;
			case "RichText":
				this.text.apply(op);
				break;
			case "Transformation":
				this.transformation.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			default:
				return;
		}
		this.subject.publish(this);
	}

	getBackgroundColor(): string {
		return this.backgroundColor;
	}

	getWidth() {
		return this.stickerPath.getWidth();
	}

	private applyBackgroundColor(backgroundColor: string): void {
		this.backgroundColor = backgroundColor;
		this.stickerPath.setBackgroundColor(backgroundColor);
	}

	setBackgroundColor(backgroundColor: string): void {
		this.emit({
			class: "Sticker",
			method: "setBackgroundColor",
			item: [this.getId()],
			backgroundColor,
		});
	}

	getIntersectionPoints(segment: Line): Point[] {
		throw new Error("Not implemented");
	}

	getMbr(): Mbr {
		const rect = this.stickerPath.getMbr();
		return rect;
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.stickerPath.getNearestEdgePointTo(point);
	}

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	isUnderPoint(point: Point): boolean {
		return (
			this.textContainer.isUnderPoint(point) ||
			this.stickerPath.isUnderPoint(point)
		);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return (
			this.textContainer.isEnclosedOrCrossedBy(rect) ||
			this.stickerPath.isEnclosedOrCrossedBy(rect)
		);
	}

	isEnclosedBy(rect: Mbr): boolean {
		return this.stickerPath.isEnclosedBy(rect);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	getNormal(point: Point): GeometricNormal {
		return this.stickerPath.getNormal(point);
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.renderShadow(context);
		this.stickerPath.render(context);
		this.text.render(context);
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("sticker-item");

		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const transform = `translate(${Math.round(translateX)}px, ${Math.round(translateY)}px) scale(${scaleX}, ${scaleY})`;
		const itemMbr = this.getMbr();
		const height = itemMbr.getHeight();
		const unscaledWidth = itemMbr.getWidth() / scaleX;
		const unscaledHeight = height / scaleY;

		div.id = this.getId();
		div.style.backgroundColor = this.backgroundColor;
		div.style.width = `${unscaledWidth}px`;
		div.style.height = `${unscaledHeight}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";
		div.style.boxShadow =
			"0px 18px 24px rgba(20, 21, 26, 0.25), 0px 8px 8px rgba(20, 21, 26, 0.125)";

		const autoScale =
			(this.text.isAutosize() && this.text.getAutoSizeScale()) || 1;
		const textElement = this.text.renderHTML(documentFactory);
		const padding = 6;
		textElement.id = `${this.getId()}_text`;
		textElement.style.overflow = "auto";
		positionRelatively(textElement, div, padding);
		resetElementScale(textElement);
		scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
		scaleElementBy(textElement, autoScale, autoScale);
		textElement.style.maxWidth = `${(width / autoScale - (2 * padding) / autoScale) * scaleX}px`;
		if (autoScale < 1) {
			textElement.style.width = `${parseInt(textElement.style.width) / (scaleX * autoScale) - 2 * padding * scaleX}px`;
		}
		const textHeight = this.text.layoutNodes.height * autoScale;
		if (textHeight < height) {
			const alignment = this.text.getVerticalAlignment();
			if (alignment === "center") {
				textElement.style.marginTop = `${(height - textHeight) / 2 / scaleY}px`;
			} else if (alignment === "bottom") {
				textElement.style.marginTop = `${(height - textHeight) / scaleY}px`;
			} else {
				textElement.style.marginTop = "0px";
			}
		}

		div.setAttribute("data-link-to", this.linkTo.serialize() || "");
		if (this.getLinkTo()) {
			const linkElement = this.linkTo.renderHTML(documentFactory);
			scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
			translateElementBy(
				linkElement,
				unscaledWidth - parseInt(linkElement.style.width) / scaleX,
				0,
			);
			div.appendChild(linkElement);
		}

		div.appendChild(textElement);

		return div;
	}

	renderShadow(context: DrawingContext): void {
		const mbr = this.getMbr();
		const { ctx } = context;

		ctx.save();
		// First shadow
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY =
			(18 - 5) *
			context.getCameraScale() *
			this.transformation.getScale().y;
		ctx.shadowColor = "rgba(20, 21, 26, 0.25)";
		ctx.shadowBlur = 24;
		ctx.fillStyle = "rgba(20, 21, 26, 0.25)";
		ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());

		// Second shadow
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY =
			(8 - 5) *
			context.getCameraScale() *
			this.transformation.getScale().y;
		ctx.shadowColor = "rgba(20, 21, 26, 0.125)";
		ctx.shadowBlur = 8;
		ctx.fillStyle = "rgba(20, 21, 26, 0.125)";
		ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());

		ctx.restore();
	}

	getPaths(): Path | Paths {
		return this.stickerPath.copy();
	}

	isClosed(): boolean {
		return true;
	}

	getPath(): Path | Paths {
		const path = this.stickerPath.copy();
		path.setBackgroundColor("none");
		return path;
	}

	getSnapAnchorPoints(): Point[] {
		const anchorPoints = StickerShape.anchorPoints;
		const points: Point[] = [];
		for (const anchorPoint of anchorPoints) {
			points.push(anchorPoint.getTransformed(this.transformation.matrix));
		}
		return points;
	}

	setDiagonal(line: Line) {
		const l = line.getLength() / _hypotenuse;
		let x = line.start.x;
		let y = line.start.y;
		if (line.end.x < line.start.x) {
			x -= l * width;
		}
		if (line.end.y < line.start.y) {
			y -= l * height;
		}
		// Smell
		this.transformation.translateTo(x, y);
		this.transformation.scaleTo(l, l);
		this.saveStickerData();
	}
	transformToCenter(pt: Point, newWidth?: number) {
		if (newWidth) {
			const scale = newWidth / width;

			const w = width * scale;
			const h = height * scale;

			this.transformation.translateTo(pt.x - w / 2, pt.y - h / 2);
			this.transformation.scaleTo(scale, scale);
		} else {
			this.transformation.translateTo(
				pt.x - width / 2,
				pt.y - height / 2,
			);
			this.transformation.scaleTo(1, 1);
		}
	}
	doResize(
		resizeType: ResizeType,
		pointer: Point,
		mbr: Mbr,
		opposite: Point,
		startMbr: Mbr,
		timeStamp: number,
	): { matrix: Matrix; mbr: Mbr } {
		const res = getProportionalResize(resizeType, pointer, mbr, opposite);

		if (["left", "right"].indexOf(resizeType) > -1) {
			const d = startMbr.getWidth() / startMbr.getHeight();
			const originallySquared =
				d > 0.99 * _relation && d < 1.01 * _relation;
			const d3 = this.getMbr().getWidth() / this.getMbr().getHeight();
			const nowSquared = d3 > 0.99 * _relation && d3 < 1.01 * _relation;
			const growSquared = res.mbr.getWidth() < startMbr.getWidth();
			const shrinkSquared =
				res.mbr.getWidth() / startMbr.getMbr().getWidth() < 0.8;

			const needGrow =
				(originallySquared && !growSquared && nowSquared) ||
				(!originallySquared && !shrinkSquared && nowSquared);
			const needShrink =
				(originallySquared && growSquared && !nowSquared) ||
				(!originallySquared && shrinkSquared && !nowSquared);

			const startWidth = this.getMbr().getWidth();
			if (needGrow) {
				this.transformation.scaleBy(1.33, 1, timeStamp);
				if (resizeType === "left") {
					this.transformation.translateBy(
						startWidth - this.getMbr().getWidth(),
						0,
						timeStamp,
					);
				}
			} else if (needShrink) {
				this.transformation.scaleBy(1 / 1.33, 1, timeStamp);
				if (resizeType === "left") {
					this.transformation.translateBy(
						startWidth - this.getMbr().getWidth(),
						0,
						timeStamp,
					);
				}
			}
		} else {
			this.transformation.scaleByTranslateBy(
				{
					x: res.matrix.scaleX,
					y: res.matrix.scaleY,
				},
				{
					x: res.matrix.translateX,
					y: res.matrix.translateY,
				},
				timeStamp,
			);
		}
		res.mbr = this.getMbr();
		this.saveStickerData();

		return res;
	}

	getRichText(): RichText {
		return this.text;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}
}
