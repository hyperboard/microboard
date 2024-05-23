import { Mbr, Line, Point, Transformation, Path, Paths, Matrix } from "..";
import { Subject } from "Subject";
import { RichText } from "../RichText";
import { Geometry } from "../Geometry";
import { DrawingContext } from "../DrawingContext";
import { Events, Operation } from "Board/Events";
import { GeometricNormal } from "../GeometricNormal";
import { ResizeType } from "../../Selection/Transformer/getResizeType";
import { getProportionalResize } from "../../Selection/Transformer/getResizeMatrix";
import { StickerCommand } from "./StickerCommand";
import { StickerData, StickerOperation } from "./StickerOperation";

export const stickerColors = {
	"Sky Blue": "rgb(174, 212, 250)",
	"Pale Yellow": "rgb(252, 245, 174)",
	"Sage Green": "rgb(175, 214, 167)",
	Lavender: "rgb(233, 191, 233)",
	"Aqua Cyan": "rgb(171, 221, 221)",
	"Pastel Red": "rgb(246, 168, 168)",
	"Light Gray": "rgb(230, 230, 230)",
} as { [color: string]: string };

const width = 200;
const height = 200;

export const StickerShape = {
	textBounds: new Mbr(5, 5, width - 5, height - 5),
	shadowPath: new Path(
		[
			new Line(new Point(2, 2), new Point(width, 2)),
			new Line(new Point(width, 2), new Point(width, height)),
			new Line(new Point(width, height), new Point(2, height)),
			new Line(new Point(2, height), new Point(2, 2)),
		],
		true,
		"rgba(255,255,255,0.1)",
		"transparent",
		"solid",
		0,
		0,
		0,
		"black",
		15,
	),
	stickerPath: new Path(
		[
			new Line(new Point(0, 0), new Point(width, 0)),
			new Line(new Point(width, 0), new Point(width, height)),
			new Line(new Point(width, height), new Point(0, height)),
			new Line(new Point(0, height), new Point(0, 0)),
		],
		true,
		stickerColors["Sky Blue"],
		"none",
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
	readonly transformation = new Transformation(this.id, this.events);
	private stickerPath = StickerShape.stickerPath.copy();
	private shadowPath = StickerShape.shadowPath.copy();
	private textContainer = StickerShape.textBounds.copy();
	readonly text = new RichText(
		this.textContainer,
		this.id,
		this.events,
		this.transformation,
		"\u00A0",
		false,
		true,
		this.itemType,
	);
	readonly subject = new Subject<Sticker>();

	constructor(
		private events?: Events,
		private id = "",
		private backgroundColor = defaultStickerData.backgroundColor,
	) {
		this.transformation.subject.subscribe(() => {
			this.transformPath();
			this.subject.publish(this);
		});
		this.text.subject.subscribe(() => {
			this.subject.publish(this);
		});
		this.text.updateElement();
	}

	emit(operation: StickerOperation): void {
		if (this.events) {
			const command = new StickerCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	serialize(): StickerData {
		return {
			itemType: "Sticker",
			backgroundColor: this.backgroundColor,
			transformation: this.transformation.serialize(),
			text: this.text.serialize(),
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
		// this.transformPath();
		this.subject.publish(this);
		return this;
	}

	private transformPath(): void {
		this.stickerPath = StickerShape.stickerPath.copy();
		this.shadowPath = StickerShape.shadowPath.copy();
		this.textContainer = StickerShape.textBounds.copy();
		const matrix = this.transformation.matrix;
		this.stickerPath.transform(matrix);
		this.shadowPath.transform(matrix);
		this.text.setContainer(this.textContainer.copy());
		this.textContainer.transform(this.transformation.matrix);
		// this.text.setContainer(this.textContainer);
		this.text.updateElement();
		this.stickerPath.setBackgroundColor(this.backgroundColor);
	}

	setId(id: string): this {
		this.id = id;
		this.text.setId(id);
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
			default:
				return;
		}
		this.subject.publish(this);
	}

	getBackgroundColor(): string {
		return this.backgroundColor;
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
		this.shadowPath.render(context);
		this.stickerPath.render(context);
		this.text.render(context);
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
		this.transformation.translateTo(x, y);
		this.transformation.scaleTo(l, l);
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
				this.transformation.scaleBy(1.33, 1);
				if (resizeType === "left") {
					this.transformation.translateBy(
						startWidth - this.getMbr().getWidth(),
						0,
					);
				}
			} else if (needShrink) {
				this.transformation.scaleBy(1 / 1.33, 1);
				if (resizeType === "left") {
					this.transformation.translateBy(
						startWidth - this.getMbr().getWidth(),
						0,
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
			);
		}
		res.mbr = this.getMbr();

		sessionStorage.setItem(
			"lastSticker",
			JSON.stringify({
				backgroundColor: this.backgroundColor,
				id: this.id,
				itemType: this.itemType,
				parent: this.parent,
				shadowPath: this.shadowPath,
				stickerPath: this.stickerPath,
			}),
		);

		return res;
	}
}
