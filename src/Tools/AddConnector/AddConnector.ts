import { Board } from 'Board';
import { Connector, Item, Point } from 'Items';
import { ConnectorLineStyle } from 'Items/Connector';
import { ConnectionLineWidth } from 'Items/Connector/Connector';
import { ConnectorSnap } from 'Items/Connector/ConnectorSnap';
import { ConnectorPointerStyle } from 'Items/Connector/Pointers/Pointers';
import { DrawingContext } from 'Items/DrawingContext';
import { BorderStyle } from 'Items/Path';
import { SessionStorage } from 'SessionStorage';
import { BoardTool } from 'Tools/BoardTool';

export class AddConnector extends BoardTool {
  connector: Connector | null = null;
  lineStyle: ConnectorLineStyle = 'curved';
  startPointer?: ConnectorPointerStyle;
  endPointer?: ConnectorPointerStyle;
  lineColor?: string;
  lineWidth?: ConnectionLineWidth;
  strokeStyle?: BorderStyle;

  snap: ConnectorSnap;

  isDraggingFromFirstToSecond = false;
  isDoneSecondPoint = false;
  isDown = false;
  isQuickAdd = false;

  constructor(board: Board, itemToStart?: Item, position?: Point) {
    super(board);
    this.snap = new ConnectorSnap(this.board);
    this.setCursor();

    const storage = new SessionStorage();
    const stroke = storage.getConnectorStrokeStyle();
    if (stroke) {
      this.strokeStyle = stroke;
    }
    const lineWidth = storage.getConnectorLineWidth();
    if (lineWidth) {
      this.lineWidth = lineWidth;
    }
    const savedColor = storage.getConnectorFillColor();
    if (savedColor) {
      this.lineColor = savedColor;
    }
    const savedStyle = storage.getConnectorLineStyle();
    if (savedStyle) {
      this.lineStyle = savedStyle;
    }
    const savedStart = storage.getConnectorPointer('start');
    if (savedStart) {
      this.startPointer = savedStart;
    }
    const savedEnd = storage.getConnectorPointer('end');
    if (savedEnd) {
      this.endPointer = savedEnd;
    }

    if (itemToStart && position) {
      this.isDown = true;
      this.isQuickAdd = true;
      const closestPoint = this.snap.getClosestPointOnItem(itemToStart, position);

      this.connector = new Connector(
        this.board,
        closestPoint,
        closestPoint,
        this.lineStyle,
        this.startPointer,
        this.endPointer,
        this.lineColor,
        this.lineWidth,
        this.strokeStyle
      );
    }
  }

  setCursor(): void {
    this.board.pointer.setCursor('crosshair');
  }

  leftButtonDown(): boolean {
    this.isDown = true;
    const point = this.snap.getControlPoint();
    if (!this.connector) {
      this.connector = new Connector(
        this.board,
        point,
        point,
        this.lineStyle,
        this.startPointer,
        this.endPointer,
        this.lineColor,
        this.lineWidth,
        this.strokeStyle
      );
    } else {
      this.connector.applyEndPoint('serialize' in point ? point.serialize() : point);
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
      this.connector.applyEndPoint('serialize' in point ? point.serialize() : point);
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
      const addedConnector = this.board.add(this.connector);
      const endPoint = this.connector.getEndPoint();
      this.board.tools.select();
      if (this.isQuickAdd && endPoint.pointType === 'Board') {
        this.board.selection.add(addedConnector);
        this.board.selection.setContext('EditUnderPointer');
        this.board.selection.showQuickAddPanel = true;
      }
    }
    this.board.tools.publish();
    return true;
  }

  keyDown(key: string): boolean {
    if (key === 'Escape') {
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

  applyLineStyle(lineStyle: ConnectorLineStyle): void {
    this.lineStyle = lineStyle;
    if (this.connector) {
      this.connector.apply({
        class: 'Connector',
        method: 'setLineStyle',
        item: [this.connector.getId()],
        lineStyle,
      });
    }
  }
}
