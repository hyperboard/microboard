import { Tool } from "../../Tools/Tool";
import { Board } from "../../Board";
import { Selection } from "../Selection";
import { SelectionItems } from "../SelectionItems";
import { Connector } from "../../Items";
import { DrawingContext } from "../../Items/DrawingContext";
import { Cursor } from "../../Pointer";
import { Anchor } from "Board/Items/Anchor";
import { ConnectorSnap } from "Board/Items/Connector/ConnectorSnap";
import {
	CONNECTOR_ANCHOR_COLOR,
	CONNECTOR_ANCHOR_TYPE,
} from "View/Items/Connector";

const config = {
	anchorDistance: 5,
};

export class ConnectorTransformer extends Tool {
	private startPointerAnchor: Anchor | null = null;
	private endPointerAnchor: Anchor | null = null;

	private statePointer: "start" | "end" | "none" = "none";
	private state: Cursor = "default";

	private snap = new ConnectorSnap(this.board);
	private connector: Connector | null = null;
	beginTimeStamp = Date.now();

	constructor(private board: Board, private selection: Selection) {
		super();
	}

	handleSelectionUpdate(items: SelectionItems): void {
		this.connector = this.getConnector(items);
		this.calculateAnchors();
	}

	private getConnector(items: SelectionItems): Connector | null {
		if (items.isSingle()) {
			const connector = items.getSingle();
			if (connector?.itemType === "Connector") {
				return connector;
			}
		}
		return null;
	}

	leftButtonDown(): boolean {
		if (this.isHoveringAnchor(this.startPointerAnchor)) {
			this.statePointer = "start";
			this.state = "grabbing";
		} else if (this.isHoveringAnchor(this.endPointerAnchor)) {
			this.statePointer = "end";
			this.state = "grabbing";
		}
		this.beginTimeStamp = Date.now();
		return this.state !== "default";
	}

	leftButtonUp(): boolean {
		this.snap.clear();
		const oldValue = this.state;
		this.statePointer = "none";
		this.state = "default";
		this.beginTimeStamp = Date.now();
		this.board.tools.publish();
		return oldValue !== "default";
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		const pointer = this.board.pointer;

		if (this.state === "grabbing") {
			this.updateConnectorPoints();
			pointer.setCursor("grabbing");
		} else if (this.isHoveringAnchor(this.startPointerAnchor)) {
			pointer.setCursor("grab");
		} else if (this.isHoveringAnchor(this.endPointerAnchor)) {
			pointer.setCursor("grab");
		} else {
			pointer.setCursor("default");
		}
		return false;
	}

	render(context: DrawingContext): void {
		this.snap.render(context);

		this.calculateAnchors();

		if (this.snap.snap.anchor) {
			this.snap.snap.anchor.render(context, CONNECTOR_ANCHOR_TYPE, true);
		}

		if (this.statePointer !== "start" && this.startPointerAnchor) {
			this.startPointerAnchor.render(context);
		}
		if (this.statePointer !== "end" && this.endPointerAnchor) {
			this.endPointerAnchor.render(context);
		}
	}

	private updateConnectorPoints(): void {
		const connector = this.connector;
		if (connector) {
			this.snap.connector = connector;
			this.snap.pointerMove();
			const point = this.snap.getControlPoint();
			switch (this.statePointer) {
				case "start":
					connector.setStartPoint(point, this.beginTimeStamp);
					this.selection.subject.publish(this.selection);
					break;
				case "end":
					connector.setEndPoint(point, this.beginTimeStamp);
					this.selection.subject.publish(this.selection);
					break;
			}
		}
	}

	private isHoveringAnchor(anchor: Anchor | null): boolean {
		if (!anchor) {
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
				CONNECTOR_ANCHOR_COLOR.anchorBackground,
			);
			const end = connector.getEndPoint();
			this.endPointerAnchor = new Anchor(
				end.x,
				end.y,
				5,
				CONNECTOR_ANCHOR_COLOR.anchorBorder,
				CONNECTOR_ANCHOR_COLOR.anchorBackground,
			);
		} else {
			this.startPointerAnchor = null;
			this.endPointerAnchor = null;
		}
	}
}
