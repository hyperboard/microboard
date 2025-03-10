import { Geometry } from "Board/Items/Geometry";
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
import { Subject } from "shared/Subject";
import { AINodeData, createNodePath } from "Board/Items/AINode/AINodeData";
import { Operation } from "Board/Events/EventsOperations";
import { TransformationOperation } from "Board/Items/Transformation/TransformationOperations";
import {
	positionRelatively,
	resetElementScale,
	scaleElementBy,
	translateElementBy,
} from "Board/HTMLRender/HTMLRender";
import { Board } from "Board";
import { DocumentFactory } from "Board/api/DocumentFactory";

export const CONTEXT_NODE_HIGHLIGHT_COLOR = "rgba(183, 138, 240, 1)";
const BUTTON_SIZE = 20;
export type ThreadDirection = 0 | 1 | 2 | 3;
const arrowIcon = new Image();
arrowIcon.src =
	"data:image/svg+xml;charset=utf-8,%3Csvg id='AIChatSendArrow' viewBox='0 0 21 21' xmlns='http://www.w3.org/2000/svg' fill='url(%23paint0_linear_7542_32550)'%3E%3Cpath d='M0.946815 7.31455C0.424815 7.14055 0.419815 6.85955 0.956815 6.68055L20.0438 0.318552C20.5728 0.142552 20.8758 0.438552 20.7278 0.956552L15.2738 20.0426C15.1238 20.5716 14.8188 20.5896 14.5948 20.0876L11.0008 11.9996L17.0008 3.99955L9.00081 9.99955L0.946815 7.31455Z'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear_7542_32550' x1='10.66' y1='0.267578' x2='10.66' y2='20.452' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23CD4FF2'/%3E%3Cstop offset='1' stop-color='%235F4AFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";

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
	private contextItems: string[] = [];
	private threadDirection: ThreadDirection = 3;
	private contextRange = 5;
	transformationRenderBlock?: boolean = undefined;
	private buttonMbr: Mbr = new Mbr();

	constructor(
		private board: Board,
		isUserRequest = false,
		parentNodeId?: string,
		contextItems: string[] = [],
		threadDirection?: ThreadDirection,
		private id = "",
	) {
		this.contextItems = contextItems;
		this.isUserRequest = isUserRequest;
		this.parentNodeId = parentNodeId;
		if (threadDirection || threadDirection === 0) {
			this.threadDirection = threadDirection;
		}
		this.transformation = new Transformation(this.id, this.board.events);
		this.linkTo = new LinkTo(this.id, this.board.events);
		this.text = new RichText(
			this.board,
			new Mbr(),
			this.id,
			this.transformation,
			this.linkTo,
			"\u00A0",
			false,
			false,
			"AINode",
		);

		// this.text.setPaddingTop(0.5);

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
		this.text.transformation.subject.subscribe(() => {
			this.transformPath();
			this.subject.publish(this);
		});

		this.linkTo.subject.subscribe(() => {
			this.subject.publish(this);
		});
		this.text.insideOf = "AINode";

		this.transformPath();
	}

	transformPath(): void {
		const { left, right, top, bottom } =
			this.text.getTransformedContainer();
		const { scaleX, scaleY } = this.transformation.matrix;
		const minScale = Math.min(scaleX, scaleY);
		const leftOffset = 20 * minScale;
		const topOffset = 20 * minScale;
		const nodeRight = right + 80 * minScale;
		const nodeBottom = bottom + (bottom - top > 400 ? 60 : 40) * minScale;
		if (
			!this.path ||
			(this.text.left < this.path.getMbr().left + leftOffset &&
				this.text.top < this.path.getMbr().top + topOffset)
		) {
			this.text.left = this.transformation.matrix.translateX + leftOffset;
			this.text.top = this.transformation.matrix.translateY + topOffset;
		}

		this.path = createNodePath(
			new Mbr(left, top, nodeRight, nodeBottom),
			this.transformation.matrix,
		);
		const scaledSize = BUTTON_SIZE * minScale;

		this.buttonMbr = new Mbr(
			nodeRight - scaledSize * 2,
			nodeBottom - scaledSize * 2,
			nodeRight - scaledSize,
			nodeBottom - scaledSize,
		);
	}

	serialize(isCopy = false): AINodeData {
		return {
			itemType: "AINode",
			transformation: this.transformation.serialize(),
			text: this.text.serialize(),
			linkTo: this.linkTo.serialize(),
			parentNodeId: isCopy ? undefined : this.parentNodeId,
			isUserRequest: this.isUserRequest,
			contextItems: this.contextItems,
			threadDirection: this.threadDirection,
		};
	}

	deserialize(data: Partial<AINodeData>): this {
		if (data.text) {
			this.text.deserialize(data.text);
		}
		if (data.transformation) {
			this.transformation.deserialize(data.transformation);
		}
		this.linkTo.deserialize(data.linkTo);
		if (data.isUserRequest) {
			this.isUserRequest = data.isUserRequest;
		}
		if (data.contextItems) {
			this.contextItems = data.contextItems;
		}
		if (data.threadDirection || data.threadDirection === 0) {
			this.threadDirection = data.threadDirection;
		}

		this.parentNodeId = data.parentNodeId;
		this.transformPath();
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

	getContextItems(): string[] {
		return this.contextItems;
	}

	// setParentId(id: string): void {
	//     this.parentNodeId = id;
	// }

	getThreadDirection(): ThreadDirection {
		return this.threadDirection;
	}

	getContextRange(): number {
		return this.contextRange;
	}

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
		const copy = this.path.copy();
		copy.setBackgroundColor("none");
		return copy;
	}

	apply(op: Operation): void {
		switch (op.class) {
			case "RichText":
				this.text.apply(op);
				break;
			case "Transformation":
				this.text.transformation.apply(op);
				break;
			case "LinkTo":
				this.linkTo.apply(op);
				break;
			default:
				return;
		}
		this.subject.publish(this);
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

	getButtonMbr() {
		return this.buttonMbr;
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

	// renderShadow(context: DrawingContext): void {
	// 	const mbr = this.getMbr();
	// 	const { ctx } = context;
	//
	// 	ctx.save();
	//
	// 	ctx.shadowOffsetX = 0;
	// 	ctx.shadowOffsetY =
	// 		(18 - 5) *
	// 		context.getCameraScale() *
	// 		this.transformation.getScale().y;
	// 	ctx.shadowColor = "rgba(20, 21, 26, 0.35)"; // Сделал тень темнее
	// 	ctx.shadowBlur = 32; // Увеличил размытие
	// 	ctx.fillStyle = "rgba(20, 21, 26, 0.35)";
	// 	ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());
	//
	// 	ctx.shadowOffsetX = 0;
	// 	ctx.shadowOffsetY =
	// 		(8 - 5) *
	// 		context.getCameraScale() *
	// 		this.transformation.getScale().y;
	// 	ctx.shadowColor = "rgba(20, 21, 26, 0.2)";
	// 	ctx.shadowBlur = 16;
	// 	ctx.fillStyle = "rgba(20, 21, 26, 0.2)";
	// 	ctx.fillRect(mbr.left, mbr.top, mbr.getWidth(), mbr.getHeight());
	//
	// 	ctx.restore();
	// }

	renderButton(context: DrawingContext): void {
		const { left, right, top, bottom } = this.buttonMbr;
		const { ctx } = context;

		ctx.save();

		if (arrowIcon.complete) {
			ctx.drawImage(arrowIcon, left, top, right - left, bottom - top);
		}

		ctx.restore();
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		// this.text.setPaddingTop(0.5);
		// this.renderShadow(context);
		this.path.render(context);
		this.renderButton(context);
		this.text.render(context);
	}
	// smell have to redo without document
	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("ainode-item");

		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const mbr = this.getMbr();
		const width = mbr.getWidth();
		const height = mbr.getHeight();
		const unscaledWidth = width;
		const unscaledHeight = height;
		const transform = `translate(${Math.round(translateX)}px, ${Math.round(translateY)}px) scale(${scaleX}, ${scaleY})`;

		div.id = this.getId();
		div.style.backgroundColor = "rgb(255, 255, 255)";
		div.style.border = "1px solid rgba(222, 224, 227, 1)";
		div.style.width = `${unscaledWidth}px`;
		div.style.height = `${unscaledHeight}px`;
		div.style.transformOrigin = "top left";
		div.style.transform = transform;
		div.style.position = "absolute";
		div.style.boxShadow =
			"0px 18px 24px rgba(20, 21, 26, 0.25), 0px 8px 8px rgba(20, 21, 26, 0.125)";
		if (this.parentNodeId) {
			div.setAttribute("parent-node-id", this.parentNodeId);
		}
		if (this.isUserRequest) {
			div.setAttribute("is-user-request", "true");
		}
		if (this.contextItems.length) {
			div.setAttribute("context-items", this.contextItems.join(","));
		}
		div.setAttribute("context-range", this.contextRange.toString());

		const textElement = this.text.renderHTML(documentFactory);
		textElement.id = `${this.getId()}_text`;
		textElement.style.maxWidth = `${width}px`;
		textElement.style.overflow = "auto";
		positionRelatively(textElement, div);
		resetElementScale(textElement);
		scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
		const [dx, dy] = [
			(width - parseInt(textElement.style.width)) / scaleX / 2 - 1,
			(height - parseInt(textElement.style.height)) / scaleY / 2 - 1,
		];
		translateElementBy(textElement, dx, dy);

		div.setAttribute("data-link-to", this.linkTo.serialize() || "");
		if (this.getLinkTo()) {
			const linkElement = this.linkTo.renderHTML(documentFactory);
			scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
			translateElementBy(
				linkElement,
				(width - parseInt(linkElement.style.width)) / scaleX,
				0,
			);
			div.appendChild(linkElement);
		}

		div.appendChild(textElement);

		return div;
	}
}
