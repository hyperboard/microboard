import { Board } from 'Board';
import { Point } from 'Items';
import { Drawing } from 'Items/Drawing';
import { DrawingContext } from 'Items/DrawingContext';
import { BorderStyle } from 'Items/Path';
import { conf } from 'Settings';
import { BoardTool } from 'Tools/BoardTool';

export class AddDrawing extends BoardTool {
  drawing: Drawing | null = null;
  isDown = false;
  strokeWidth = conf.PEN_INITIAL_STROKE_WIDTH;
  strokeColor = conf.PEN_DEFAULT_COLOR;
  strokeStyle: BorderStyle = conf.PEN_STROKE_STYLE;

  constructor(board: Board) {
    super(board);
    this.setCursor();

    if (conf.PEN_SETTINGS_KEY) {
      const drawingSettings = localStorage.getItem(conf.PEN_SETTINGS_KEY);
      if (drawingSettings) {
        const { strokeWidth, strokeColor, strokeStyle } = JSON.parse(drawingSettings);
        this.strokeWidth = strokeWidth;
        this.strokeColor = strokeColor;
        this.strokeStyle = strokeStyle;
      }
    }
  }

  private updateSettings() {
    localStorage.setItem(
      conf.PEN_SETTINGS_KEY,
      JSON.stringify({
        strokeWidth: this.strokeWidth,
        strokeColor: this.strokeColor,
        strokeStyle: this.strokeStyle,
      })
    );
  }

  setStrokeWidth(strokeWidth: number): void {
    this.strokeWidth = strokeWidth;
    this.updateSettings();
    this.board.tools.publish();
  }

  setStrokeColor(strokeColor: string): void {
    this.strokeColor = strokeColor;
    this.updateSettings();
    this.board.tools.publish();
  }

  getStrokeWidth(): number {
    return this.strokeWidth;
  }

  getStrokeColor(): string {
    return this.strokeColor;
  }

  renderPointerCircle(point: Point, context: DrawingContext) {
    if (this.strokeColor === 'none') {
      return;
    }
    const ctx = context.ctx;
    ctx.beginPath();
    ctx.arc(point.x, point.y, this.strokeWidth / 2, 0, 2 * Math.PI, false);
    ctx.lineWidth = 1;
    ctx.strokeStyle = conf.PEN_POINTER_CIRCLE_COLOR;
    ctx.stroke();
  }

  setCursor(): void {
    this.board.pointer.setCursor('pen');
  }

  isHighlighter(): boolean {
    return false;
  }

  leftButtonDown(): boolean {
    if (this.strokeColor === 'none') {
      return false;
    }
    this.isDown = true;
    this.drawing = new Drawing(this.board, []);
    this.board.tools.publish();
    return true;
  }

  pointerMoveBy(_x: number, _y: number): boolean {
    if (this.isDown && this.drawing) {
      const pointer = this.board.pointer.point.copy();
      this.drawing.addPoint(pointer);
    }
    this.board.tools.publish();
    return true;
  }

  leftButtonUp(): boolean {
    if (!this.drawing) {
      return false;
    }

    this.isDown = false;
    const points = this.drawing.points;
    if (points.length === 0) {
      const pointer = this.board.pointer.point.copy();
      this.drawing.addPoint(pointer);
    }
    const mbr = this.drawing.getMbr();
    const x = mbr.left;
    const y = mbr.top;

    if (points.length === 0) {
      return false;
    }
    for (const point of points) {
      point.x -= x;
      point.y -= y;
    }
    const drawing = new Drawing(this.board, points);
    drawing.transformation.translateTo(x, y);
    drawing.setStrokeColor(this.strokeColor);
    drawing.setStrokeWidth(this.strokeWidth);
    drawing.setBorderStyle(this.strokeStyle);
    this.board.add(drawing).updateMbr();
    this.board.selection.removeAll();
    this.drawing = null;
    this.board.tools.publish();
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
    if (conf.PEN_RENDER_POINTER_CIRCLE) {
      this.renderPointerCircle(this.board.pointer.point, context);
    }

    if (!this.drawing) {
      return;
    }

    const drawing = this.drawing;
    drawing.setStrokeColor(this.strokeColor);
    drawing.setStrokeWidth(this.strokeWidth);
    drawing.setBorderStyle(this.strokeStyle);
    drawing.render(context);
  }
}
