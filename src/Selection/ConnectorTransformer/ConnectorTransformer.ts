import { Board } from 'Board';
import { Connector, Point } from 'Items';
import { Anchor } from 'Items/Anchor';
import { ControlPoint } from 'Items/Connector';
// TODO move to conf
import { CONNECTOR_ANCHOR_TYPE, CONNECTOR_ANCHOR_COLOR } from 'Items/Connector/Connector';
import { ConnectorSnap } from 'Items/Connector/ConnectorSnap';
import { ControlPointData } from 'Items/Connector/ControlPoint';
import { DrawingContext } from 'Items/DrawingContext';
import { Cursor } from 'Pointer';
import { SelectionItems } from 'Selection/SelectionItems';
import { Tool } from 'Tools/Tool';

const config = {
	anchorDistance: 10,
};

type PointersState = 'start' | 'end' | 'middle' | 'none';
export class ConnectorTransformer extends Tool {
	private startPointerAnchor: Anchor | null = null;
	private endPointerAnchor: Anchor | null = null;
	private middlePointerAnchor: Anchor | null = null;

	private statePointer: PointersState = 'none';
	private state: Cursor = 'default';

	private snap: ConnectorSnap;
	private connector: Connector | null = null;
	beginTimeStamp = Date.now();

	constructor(private board: Board, private selection: Selection) {
		super();
		this.snap = new ConnectorSnap(this.board);
	}

	handleSelectionUpdate(items: SelectionItems): void {
		this.connector = this.getConnector(items);
		this.calculateAnchors();
	}

	private getConnector(items: SelectionItems): Connector | null {
		if (items.isSingle()) {
			const connector = items.getSingle();
			if (connector?.itemType === 'Connector') {
				return connector;
			}
		}
		return null;
	}

	leftButtonDown(): boolean {
		if (this.isHoveringAnchor(this.startPointerAnchor)) {
			this.statePointer = 'start';
			this.state = 'grabbing';
		} else if (this.isHoveringAnchor(this.endPointerAnchor)) {
			this.statePointer = 'end';
			this.state = 'grabbing';
		} else if (this.isHoveringAnchor(this.middlePointerAnchor)) {
			this.statePointer = 'middle';
			this.state = 'grabbing';
		}

		this.beginTimeStamp = Date.now();
		return this.state !== 'default';
	}

	leftButtonUp(): boolean {
		this.snap.clear();
		const oldValue = this.state;
		this.statePointer = 'none';
		this.state = 'default';
		this.beginTimeStamp = Date.now();
		this.board.tools.publish();
		return oldValue !== 'default';
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		const pointer = this.board.pointer;
		const connector = this.board.selection.items.getSingle();

		if (connector && connector.transformation.isLocked) {
			pointer.setCursor('default');
			return false;
		}

		if (this.state === 'grabbing') {
			this.updateConnectorPoints();
			pointer.setCursor('grabbing');
		} else if (
			this.isHoveringAnchor(this.startPointerAnchor) ||
			this.isHoveringAnchor(this.endPointerAnchor)
		) {
			pointer.setCursor('grab');
		} else {
			pointer.setCursor('default');
		}
		return false;
	}

	render(context: DrawingContext): void {
		this.snap.render(context);

		this.calculateAnchors();

		if (this.snap.snap.anchor) {
			this.snap.snap.anchor.render(context, CONNECTOR_ANCHOR_TYPE, true);
		}

		if (this.statePointer !== 'start' && this.startPointerAnchor) {
			this.startPointerAnchor.render(context);
		}
		if (this.statePointer !== 'end' && this.endPointerAnchor) {
			this.endPointerAnchor.render(context);
		}

		if (this.statePointer !== 'middle' && this.middlePointerAnchor) {
			this.middlePointerAnchor.render(context, 'circle');
		}
	}

	private updateConnectorPoints(): void {
		const connector = this.connector;
		if (connector) {
			this.snap.connector = connector;
			this.snap.pointerMove();
			const point = this.snap.getControlPoint();
			const setterMap: Record<
				PointersState,
				(point: ControlPoint | ControlPointData, timestamp?: number) => void
			> = {
				start: connector.setStartPoint,
				end: connector.setEndPoint,
				middle: connector.setMiddlePoint,
				none: () => {},
			};
			setterMap[this.statePointer](point, this.beginTimeStamp);
			this.selection.subject.publish(this.selection);
		}
	}

	private isHoveringAnchor(anchor: Anchor | null): boolean {
		if (!anchor || !this.connector) {
			return false;
		}
		const camera = this.board.camera;
		const anchorDistance = config.anchorDistance / camera.getScale();

		const pointer = this.board.pointer;
		const cursorPoint = pointer.point;
		const point = anchor.getMbr().getCenter();

		return cursorPoint.getDistance(point) < anchorDistance;
	}

	private calculateAnchors(): void {
		const connector = this.connector;
		if (connector) {
			const start = connector.getStartPoint();
			this.startPointerAnchor = new Anchor(
				start.x,
				start.y,
				5,
				CONNECTOR_ANCHOR_COLOR.anchorBorder,
				CONNECTOR_ANCHOR_COLOR.anchorBackground
			);
			const end = connector.getEndPoint();
			this.endPointerAnchor = new Anchor(
				end.x,
				end.y,
				5,
				CONNECTOR_ANCHOR_COLOR.anchorBorder,
				CONNECTOR_ANCHOR_COLOR.anchorBackground
			);
			const middlePoints = connector.getMiddlePoint() || connector.calculateMiddlePoint();
			const nearestMiddlePoint = connector.getNearestEdgePointTo(
				new Point(middlePoints.x, middlePoints.y)
			);
			this.middlePointerAnchor = new Anchor(
				nearestMiddlePoint.x,
				nearestMiddlePoint.y,
				5,
				CONNECTOR_ANCHOR_COLOR.anchorBorder,
				CONNECTOR_ANCHOR_COLOR.anchorBorder
			);
		} else {
			this.startPointerAnchor = null;
			this.endPointerAnchor = null;
			this.middlePointerAnchor = null;
		}
	}
}
