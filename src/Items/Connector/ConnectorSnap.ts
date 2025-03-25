import { Board } from "../../Board";
import {
	BoardPoint,
	ControlPoint,
	FixedConnectorPoint,
	FixedPoint,
	toRelativePoint,
} from "./ControlPoint";
import { Point } from "../Point";
import { Item } from "../Item";
import { DrawingContext } from "../DrawingContext";
import { Anchor } from "../Anchor";
import { Path, Paths } from "../Path";
import {
	Connector,
	CONNECTOR_ANCHOR_COLOR,
	CONNECTOR_ANCHOR_TYPE,
} from "./Connector";

function getFixedPoint(
	item: Item,
	point: Point,
): FixedPoint | FixedConnectorPoint {
	if (item.itemType === "Connector") {
		const nearestSegmentData = item
			.getPaths()
			.getNearestEdgeAndPointTo(point);
		const segment = nearestSegmentData.segment;
		const index = nearestSegmentData.index;
		const tangent = segment.getParameter(point);
		return new FixedConnectorPoint(item, tangent, index);
	} else {
		const relativePoint = toRelativePoint(point, item);
		return new FixedPoint(item, relativePoint);
	}
}
export class ConnectorSnap {
	distance = {
		neighbor: 5,
		border: 10,
		anchor: 15,
	};

	maxNeighbors = 10;
	timeout = 2000;
	connectorAttachLimit = {
		start: 0.05,
		end: 0.8,
	};

	color = CONNECTOR_ANCHOR_COLOR;

	snap: {
		item: Item | null;
		path: Path | Paths | null;
		anchors: Anchor[];
		anchor: Anchor | null;
		point: Anchor | null;
	} = {
		item: null,
		path: null,
		anchors: [],
		anchor: null,
		point: null,
	};

	hover: {
		item: Item | null;
		timeout: NodeJS.Timeout | null;
		isTimeoutElapsed: boolean;
	} = {
		item: null,
		timeout: null,
		isTimeoutElapsed: false,
	};

	controlPoint: ControlPoint | null = null;

	connector: Connector | null = null;

	constructor(private board: Board) {}

	getControlPoint(): ControlPoint {
		if (this.controlPoint) {
			return this.controlPoint;
		} else {
			const { x, y } = this.board.pointer.point;
			return new BoardPoint(x, y);
		}
	}

	pointerMove(): void {
		this.setHover();
		const nearest = this.getNearest();
		if (this.isNearBorder(nearest)) {
			this.snap.item = nearest;
		} else {
			this.snap.item = null;
		}

		this.setSnap();

		const pointer = this.board.pointer.point;

		const { anchor, item, point } = this.snap;
		if (!item) {
			const pointer = this.board.pointer.point;
			this.controlPoint = new BoardPoint(pointer.x, pointer.y);
		} else if (anchor) {
			this.controlPoint = getFixedPoint(item, anchor.getCenter());
		} else if (point) {
			const nearest = item.getNearestEdgePointTo(pointer);
			this.controlPoint = getFixedPoint(item, nearest);
		} else {
			if (this.hover.isTimeoutElapsed) {
				this.controlPoint = getFixedPoint(item, pointer);
			} else {
				this.controlPoint = getFixedPoint(item, pointer);
			}
		}
	}

	setHover(): void {
		const hover = this.board.items.getUnderPointer(0)[0];
		if (hover) {
			if (hover !== this.hover.item) {
				this.hover = {
					item: hover,
					timeout: setTimeout(() => {
						this.hover.isTimeoutElapsed = true;
						const path = this.snap.path;
						if (path) {
							path.setBackgroundColor(this.color.snapBackground);
							this.board.tools.publish();
						}
					}, this.timeout),
					isTimeoutElapsed: false,
				};
			}
		} else {
			if (this.hover.timeout) {
				clearTimeout(this.hover.timeout);
			}
			this.hover = {
				item: null,
				timeout: null,
				isTimeoutElapsed: false,
			};
		}
	}

	getNearest(): Item | null {
		const neighbors = this.board.items.getNearPointer(
			this.distance.neighbor / this.board.camera.getScale(),
			this.maxNeighbors,
		);
		const pointer = this.board.pointer.point;

		let nearest: Item | null = null;
		let nearestDistance = Number.MAX_VALUE;
		let tangent: number | null = null;

		for (const neighbor of neighbors) {
			if (neighbor === this.connector) {
				continue;
			}
			const edgePoint = neighbor.getNearestEdgePointTo(pointer);
			const distance = pointer.getDistance(edgePoint);
			const isConnector = neighbor.itemType === "Connector";

			const isFloatingConnector =
				isConnector &&
				neighbor !== this.connector &&
				neighbor.getStartPoint().pointType !== "Board" &&
				neighbor.getEndPoint().pointType !== "Board";

			if (isFloatingConnector) {
				const boardPointer = this.board.pointer.point;
				const point =
					this.snap.anchor?.getCenter() ||
					(this.snap.point
						? neighbor.getNearestEdgePointTo(boardPointer)
						: boardPointer);

				const nearestSegmentData = neighbor
					.getPaths()
					.getNearestEdgeAndPointTo(point);
				tangent = nearestSegmentData.segment.getParameter(point);
			}

			const { start, end } = this.connectorAttachLimit;
			const isConnectorNearEndpoint =
				tangent !== null &&
				(tangent < start || tangent > end) &&
				isConnector;

			if (distance < nearestDistance && !isConnectorNearEndpoint) {
				nearestDistance = distance;
				nearest = neighbor;
			}
		}

		return nearest;
	}

	getClosestPointOnItem(item: Item, position: Point): ControlPoint {
		const nearestEdgePoint = item.getNearestEdgePointTo(position);
		return getFixedPoint(item, nearestEdgePoint);
	}

	isNearBorder(item: Item | null): boolean {
		if (!item) {
			return false;
		}
		const pointer = this.board.pointer.point;
		const point = item.getNearestEdgePointTo(pointer);
		const distance = pointer.getDistance(point);
		return distance < this.distance.border / this.board.camera.getScale();
	}

	setSnap(): void {
		const item = this.snap.item;
		const path = item?.getPath();
		if (!item || !path) {
			this.snap.path = null;
			this.snap.anchors = [];
			this.snap.anchor = null;
			this.snap.point = null;
		} else {
			path.setBorderColor(this.color.snapBorder);
			this.snap.path = path;
			if (
				this.snap.item === this.hover.item &&
				!this.hover.isTimeoutElapsed
			) {
				path.setBackgroundColor(this.color.snapBackgroundHighlight);
			}
			this.setAnchors(item);
		}
	}

	setAnchors(item: Item): void {
		const points = item.getSnapAnchorPoints();
		if (!points) {
			return;
		}

		const anchors: Anchor[] = [];
		for (const { x, y } of points) {
			anchors.push(
				new Anchor(
					x,
					y,
					5,
					this.color.anchorBorder,
					this.color.anchorBackground,
					1,
				),
			);
		}
		this.snap.anchors = anchors;
		this.setNearestAnchor();
		this.setPoint();
	}

	setNearestAnchor(): void {
		const oldAnchor = this.snap.anchor;
		if (oldAnchor) {
			oldAnchor.backgroundColor = this.color.snapBackground;
		}
		const pointer = this.board.pointer.point;

		let nearest: Anchor | null = null;
		for (const anchor of this.snap.anchors) {
			if (
				nearest &&
				anchor.getDistanceTo(pointer) < nearest.getDistanceTo(pointer)
			) {
				nearest = anchor;
			} else if (
				!nearest &&
				anchor.getDistanceTo(pointer) < this.distance.anchor
			) {
				nearest = anchor;
			}
		}
		if (nearest) {
			nearest.backgroundColor = this.color.snapBackgroundHighlight;
			this.snap.point = null;
		}
		this.snap.anchor = nearest;
	}

	setPoint(): void {
		const pointer = this.board.pointer.point;
		const { item, anchor } = this.snap;
		if (item) {
			if (!anchor) {
				const point = item.getNearestEdgePointTo(pointer);
				if (
					point.getDistance(pointer) < this.distance.border ||
					!this.hover.isTimeoutElapsed
				) {
					this.snap.point = new Anchor(
						point.x,
						point.y,
						5,
						this.color.pointBorder,
						this.color.pointBackground,
						1,
					);
				} else {
					this.snap.point = null;
				}
			}
		}
	}

	clear(): void {
		this.snap.item = null;
		this.snap.path = null;
		this.snap.anchors = [];
		this.snap.anchor = null;
		this.snap.point = null;
	}

	render(context: DrawingContext): void {
		const { path, anchors, point } = this.snap;

		if (path) {
			path.render(context);
		}
		for (const anchor of anchors) {
			anchor.render(context, CONNECTOR_ANCHOR_TYPE);
		}
		if (point) {
			point.render(context, CONNECTOR_ANCHOR_TYPE);
		}

		// if (anchor) {
		// 	anchor.render(context, CONNECTOR_ANCHOR_TYPE, true);
		// }
	}
}
