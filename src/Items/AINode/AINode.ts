import { Geometry } from "Board/Items/Geometry";
import { Events } from "Board/Events/Events";
import { Transformation } from "Board/Items/Transformation/Transformation";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { GeometricNormal } from "Board/Items/GeometricNormal";
import { RichText } from "Board/Items/RichText/RichText";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Point } from "Board/Items/Point/Point";
import { Line } from "Board/Items/Line/Line";
import { Path } from "Board/Items/Path/Path";
import { Paths } from "Board/Items/Path/Paths";
import { LinkTo } from "Board/Items/LinkTo/LinkTo";
import { Subject } from "Subject";
import { AINodeData, AINodeShape } from "Board/Items/AINode/AINodeData";
import { Operation } from "Board/Events/EventsOperations";
import { TransformationOperation } from "Board/Items/Transformation/TransformationOperations";

export class AINode implements Geometry {
	readonly itemType = "AINode";
	parent = "Board";
	readonly transformation: Transformation;
	readonly text: RichText;
	readonly linkTo: LinkTo;
	private path: Paths | Path;
	readonly subject = new Subject<AINode>();
	private parentNodeId?: string;
	private isUserRequest: boolean;
	transformationRenderBlock?: boolean = undefined;

	constructor(
		isUserRequest = false,
		parentNodeId?: string,
		private events?: Events,
		private id = "",
	) {
		this.isUserRequest = isUserRequest;
		this.parentNodeId = parentNodeId;
		this.transformation = new Transformation(this.id, this.events);
		this.linkTo = new LinkTo(this.id, this.events);
		this.text = new RichText(
			new Mbr(),
			this.id,
			this.events,
			this.transformation,
			this.linkTo,
			"\u00A0",
			true,
			false,
			"AINode",
		);

		this.transformPath();

		this.transformation.subject.subscribe(
			(_subject: Transformation, op: TransformationOperation) => {
				if (
					op.method === "translateTo" ||
					op.method === "translateBy"
				) {
					this.text.transformCanvas();
				} else if (op.method === "transformMany") {
					const currItemOp = op.items[this.getId()];
					if (
						currItemOp.method === "translateBy" ||
						currItemOp.method === "translateTo" ||
						(currItemOp.method === "scaleByTranslateBy" &&
							currItemOp.scale.x === 1 &&
							currItemOp.scale.y === 1)
					) {
						// translating
						this.text.transformCanvas();
					} else {
						// scaling
						this.text.handleInshapeScale();
					}
				} else {
					if (op.method === "scaleByTranslateBy") {
						this.text.handleInshapeScale();
					} else {
						this.text.updateElement();
					}
				}
				this.transformPath();
				this.subject.publish(this);
			},
		);
		this.text.subject.subscribe(() => {
			this.transformPath();
			this.subject.publish(this);
		});
		this.linkTo.subject.subscribe(() => {
			this.subject.publish(this);
		});
		this.text.insideOf = "AINode";

		this.transformPath();
	}

	// updateMbr(): Mbr {
	//     const rect = this.path.getMbr();
	//     const textRect = this.text.getMbr();
	//     rect.combine([textRect]);
	//     return textRect;
	// }

	private transformPath(): void {
		const { left, right, top, bottom } =
			this.text.getTransformedContainer();
		const segments = new Mbr(
			left - 10,
			top - 10,
			right + 10,
			bottom + 10,
		).getLines();
		this.path = new Path(segments, true, "rgb(255, 255, 255)", "none");
	}

	serialize(): AINodeData {
		return {
			itemType: "AINode",
			transformation: this.transformation.serialize(),
			text: this.text.serialize(),
			linkTo: this.linkTo.serialize(),
			parentNodeId: this.parentNodeId,
			isUserRequest: this.isUserRequest,
		};
	}

	deserialize(data: Partial<AINodeData>): this {
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
			this.transformPath();
		}
		if (data.text) {
			this.text.deserialize(data.text);
		}
		this.linkTo.deserialize(data.linkTo);
		if (data.isUserRequest) {
			this.isUserRequest = data.isUserRequest;
		}
		this.parentNodeId = data.parentNodeId;
		this.subject.publish(this);
		return this;
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

	// setParentId(id: string): void {
	//     this.parentNodeId = id;
	// }

	getParentId(): string | undefined {
		return this.parentNodeId;
	}

	getIsUserRequest(): boolean {
		return this.isUserRequest;
	}

	isClosed(): boolean {
		return true;
	}

	getPath(): Path | Paths {
		return this.path.copy();
	}

	apply(op: Operation): void {
		switch (op.class) {
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

	getDistanceToPoint(point: Point): number {
		const nearest = this.getNearestEdgePointTo(point);
		return point.getDistance(nearest);
	}

	getIntersectionPoints(segment: Line): Point[] {
		throw new Error("Not implemented");
	}

	getMbr(): Mbr {
		return this.path.getMbr();
	}

	getNearestEdgePointTo(point: Point): Point {
		return this.path.getNearestEdgePointTo(point);
	}

	getNormal(point: Point): GeometricNormal {
		return this.path.getNormal(point);
	}

	isEnclosedBy(rect: Mbr): boolean {
		return this.path.isEnclosedBy(rect);
	}

	isEnclosedOrCrossedBy(rect: Mbr): boolean {
		return this.path.isEnclosedOrCrossedBy(rect);
	}

	isInView(rect: Mbr): boolean {
		return this.isEnclosedOrCrossedBy(rect);
	}

	isNearPoint(point: Point, distance: number): boolean {
		return distance > this.getDistanceToPoint(point);
	}

	isUnderPoint(point: Point, tolerance = 5): boolean {
		return this.path.isUnderPoint(point);
	}

	getRichText(): RichText {
		return this.text;
	}

	getLinkTo(): string | undefined {
		return this.linkTo.link;
	}

	getLink() {
		return `${window.location.origin}${
			window.location.pathname
		}?focus=${this.getId()}`;
	}

	renderShadow(context: DrawingContext): void {
		const mbr = this.getMbr();
		const { ctx } = context;

		ctx.save();

		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY =
			(18 - 5) *
			context.getCameraScale() *
			this.transformation.getScale().y;
		ctx.shadowColor = "rgba(20, 21, 26, 0.35)"; // Сделал тень темнее
		ctx.shadowBlur = 32; // Увеличил размытие
		ctx.fillStyle = "rgba(20, 21, 26, 0.35)";
		ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());

		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY =
			(8 - 5) *
			context.getCameraScale() *
			this.transformation.getScale().y;
		ctx.shadowColor = "rgba(20, 21, 26, 0.2)";
		ctx.shadowBlur = 16;
		ctx.fillStyle = "rgba(20, 21, 26, 0.2)";
		ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());

		ctx.restore();
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.renderShadow(context);
		this.path.render(context);
		this.text.render(context);
	}
}
