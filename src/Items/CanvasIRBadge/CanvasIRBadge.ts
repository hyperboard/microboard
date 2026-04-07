import type { Canvas2DGeometryIRContext } from "canvas2d-geometry-ir";
import { Board } from "Board";
import { DefaultTransformationData } from "Geometry/Transformation/TransformationData";
import { registerItem } from "Items/RegisterItem";
import { CanvasIRItem } from "Items/BaseItem/CanvasIRItem";
import type { SerializedItemData } from "Items/BaseItem/BaseItem";
import { CanvasIRBadgeDataSchema, type CanvasIRBadgeData } from "./CanvasIRBadge.schema";

export class DefaultCanvasIRBadgeData implements CanvasIRBadgeData {
  readonly itemType = "CanvasIRBadge";
  [key: string]: unknown;

  constructor(
    public width = 160,
    public height = 96,
    public backgroundColor = "#FFF2C2",
    public borderColor = "#D97706",
    public borderWidth = 3,
    public transformation = new DefaultTransformationData(),
    public linkTo?: string,
  ) {}
}

export class CanvasIRBadge extends CanvasIRItem<CanvasIRBadge> {
  readonly itemType = "CanvasIRBadge";
  width = 160;
  height = 96;
  backgroundColor = "#FFF2C2";
  borderColor = "#D97706";
  borderWidth = 3;

  constructor(board: Board, id = "") {
    super(board, id);
  }

  protected renderToCanvasIR(ctx: Canvas2DGeometryIRContext): void {
    const w = this.width;
    const h = this.height;
    const r = Math.min(w, h) * 0.18;
    const notchWidth = Math.min(28, w * 0.16);
    const notchDepth = Math.min(18, h * 0.22);
    const notchLeft = w * 0.34;
    const notchRight = notchLeft + notchWidth;

    ctx.fillStyle = this.backgroundColor;
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = this.borderWidth;

    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.bezierCurveTo(w - r * 0.45, 0, w, r * 0.45, w, r);
    ctx.lineTo(w, h - r);
    ctx.bezierCurveTo(w, h - r * 0.45, w - r * 0.45, h, w - r, h);
    ctx.lineTo(notchRight, h);
    ctx.lineTo((notchLeft + notchRight) / 2, h + notchDepth);
    ctx.lineTo(notchLeft, h);
    ctx.lineTo(r, h);
    ctx.bezierCurveTo(r * 0.45, h, 0, h - r * 0.45, 0, h - r);
    ctx.lineTo(0, r);
    ctx.bezierCurveTo(0, r * 0.45, r * 0.45, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  override serialize(): SerializedItemData<CanvasIRBadgeData> {
    return {
      ...super.serialize(),
      itemType: "CanvasIRBadge",
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      borderColor: this.borderColor,
      borderWidth: this.borderWidth,
    };
  }
}

registerItem({
  item: CanvasIRBadge,
  defaultData: new DefaultCanvasIRBadgeData(),
  schema: CanvasIRBadgeDataSchema,
});
