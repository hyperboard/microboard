import { Connector, ConnectorLineStyle } from "Board/Items/Connector";
import { ConnectorSnap } from "Board/Items/Connector/ConnectorSnap";
import { DrawingContext } from "Board/Items/DrawingContext";
import { BoardTool } from "../BoardTool";
import { Board } from "Board/Board";
import { Item, Point } from "Board/Items";

export class AddConnector extends BoardTool {
	connector: Connector | null = null;
	lineStyle: ConnectorLineStyle = "curved";

	snap = new ConnectorSnap(this.board);

	isDraggingFromFirstToSecond = false;
	isDoneSecondPoint = false;
	isDown = false;

	constructor(board: Board, itemToStart?: Item, position?: Point) {
		super(board);
		this.setCursor();
		if (itemToStart && position) {
			this.isDown = true;
			const closestPoint = this.snap.getClosestPointOnItem(
				itemToStart,
				position,
			);
			(this.lineStyle = "orthogonal"),
				(this.connector = new Connector(
					this.board,
					undefined,
					closestPoint,
					closestPoint,
					this.lineStyle,
				));
		}
	}

	setCursor(): void {
		this.board.pointer.setCursor("crosshair");
	}

	leftButtonDown(): boolean {
		this.isDown = true;
		const point = this.snap.getControlPoint();
		if (!this.connector) {
			this.connector = new Connector(this.board, undefined, point, point);
			this.connector.setLineStyle(this.lineStyle);
		} else {
			this.connector.setEndPoint(point);
			this.isDoneSecondPoint = true;
		}
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		this.snap.pointerMove();

		if (this.connector) {
			if (this.isDown) {
				this.isDraggingFromFirstToSecond = true;
			}
			const point = this.snap.getControlPoint();
			this.connector.setEndPoint(point);
		}
		this.board.tools.publish();
		return true;
	}

	leftButtonUp(): boolean {
		this.isDown = false;
		if (!this.connector) {
			return true;
		}
		if (this.isDoneSecondPoint) {
			this.board.add(this.connector);
			this.board.tools.select();
		} else if (this.isDraggingFromFirstToSecond) {
			this.board.add(this.connector);
			this.board.tools.select();
		}
		this.board.tools.publish();
		return true;
	}

	keyDown(key: string): boolean {
		if (key === "Escape") {
			this.board.tools.select();
		}
		return true;
	}

	middleButtonDown(): boolean {
		this.board.tools.navigate();
		const navigate = this.board.tools.getNavigate();
		if (!navigate) {
			return false;
		}
		navigate.returnToTool = this.returnToTool;
		navigate.middleButtonDown();
		return true;
	}

	rightButtonDown(): boolean {
		this.board.tools.navigate();
		const navigate = this.board.tools.getNavigate();
		if (!navigate) {
			return false;
		}
		navigate.returnToTool = this.returnToTool;
		navigate.rightButtonDown();
		return true;
	}

	returnToTool = (): void => {
		this.board.tools.setTool(this);
		this.setCursor();
	};

	render(context: DrawingContext): void {
		if (this.connector) {
			this.connector.render(context);
		}
		this.snap.render(context);
	}

	setLineStyle(lineStyle: ConnectorLineStyle): void {
		this.lineStyle = lineStyle;
		if (this.connector) {
			this.connector.setLineStyle(lineStyle);
		}
	}
}
