import { BaseItem, BaseItemData, SerializedItemData } from "Items/BaseItem/BaseItem";
import { Operation } from "Events";
import { BorderWidth, Path, BorderStyle, Point } from "Items";
import { createRoundedRectanglePath } from "Items/Shape/Basic/RoundedRectangle";
import { Subject } from "Subject";
import { Board } from "Board";
import { DrawingContext } from "Items";
import { DiceOperation } from "./DiceOperation";
import { registerItem } from "Items";
import { AddDice } from "./AddDice";
import { conf } from "Settings";
import { getMediaSignedUrl } from "api/MediaHelpers";
import { propertyOps } from "Items/propertyOps";
import { addDiceToolOverlay, diceOverlay } from "./DiceOverlay";

export type DiceType = "common" | "custom";

const TIMEOUT = 2000;

export interface DiceData extends BaseItemData {
  type?: DiceType;
  valueIndex?: number;
  values?: (number | string)[];
}

export const defaultDiceData: DiceData = {
  itemType: "Dice",
  type: "common",
  backgroundColor: "#FFFFFF",
  backgroundOpacity: 1,
  borderColor: "#000207",
  borderOpacity: 1,
  borderStyle: "solid",
  borderWidth: 1,
  valueIndex: 0,
  values: [1, 2, 3, 4, 5, 6],
};

export class Dice extends BaseItem<Dice> {
  readonly itemType = "Dice";
  private type: DiceType = "common";
  private path: Path;
  readonly subject = new Subject<Dice>();
  drawingContext: DrawingContext | null = null;
  public backgroundColor = "#FFFFFF";
  public borderColor = "#000207";
  public borderStyle: BorderStyle = "solid";
  private borderWidth = 1;

  private values: (number | string)[] = [];
  private valueIndex = 0;
  private renderValues: (number | HTMLImageElement)[] = [];
  private animationFrameId: number | undefined;

  constructor(
    board: Board,
    id = "",
  ) {
    super(board, id);
    this.path = createRoundedRectanglePath(this.getMbr()).copy(); // definitely assign it

    const data = defaultDiceData;
    if (data.type) {
      this.type = data.type;
    }
    if (data.values) {
      this.values = data.values;
    }
    if (data.valueIndex !== undefined) {
      this.valueIndex = data.valueIndex;
    }

    this.updateRenderValues();

    this.transformPath();

    this.updateMbr();
  }

  private transformPath(): void {
    this.path = createRoundedRectanglePath(this.getMbr()).copy();
    this.path.transform(this.transformation.toMatrix());

    this.path.setBackgroundColor(this.backgroundColor);
    this.path.setBorderColor(this.borderColor);
    this.path.setBorderWidth(this.borderWidth);
  }

  async updateRenderValues(): Promise<void> {
    this.values.forEach(async (value: number | string, index: number) => {
      if (typeof value === "number") {
        this.renderValues[index] = value;
      } else {
        const image = conf.documentFactory.createElement("img") as HTMLImageElement;
        image.src = await getMediaSignedUrl(value) || "";
        this.renderValues[index] = image;
        image.onload = () => {
          this.subject.publish(this);
        };
        image.onerror = () => {
          this.renderValues[index] = index + 1;
          this.subject.publish(this);
        };
      }
    })
  }

  render(context: DrawingContext): void {
    this.drawingContext = context;
    if (this.transformationRenderBlock) {
      return;
    }

    context.ctx.save();

    if (this.animationFrameId) {
      const now = Date.now();
      const angle = ((now % 500) / 500) * 2 * Math.PI;
      const mbr = this.getMbr();
      const centerX = (this.mbr.left + this.mbr.right) / 2;
      const centerY = (this.mbr.top + this.mbr.bottom) / 2;
      context.ctx.translate(centerX, centerY);
      context.ctx.rotate(angle);
      context.ctx.translate(-centerX, -centerY);
    }

    this.path.render(context);
    const mbr = this.getMbr();
    const centerX = (this.mbr.left + this.mbr.right) / 2;
    const centerY = (this.mbr.top + this.mbr.bottom) / 2;

    const valueToRender = this.renderValues[this.valueIndex];
    if (typeof valueToRender === "number") {
      context.ctx.fillStyle = "black";
      context.ctx.font = `bold ${this.getHeight() / 3}px sans-serif`;
      context.ctx.textAlign = "center";
      context.ctx.textBaseline = "middle";
      context.ctx.fillText(String(valueToRender), centerX, centerY);
    } else if (valueToRender instanceof HTMLImageElement) {
      const size = this.getHeight() / 3;
      if (valueToRender.complete && valueToRender.naturalWidth > 0) {
        context.ctx.drawImage(
          valueToRender,
          centerX - size / 2,
          centerY - size / 2,
          size,
          size
        );
      } else {
        context.ctx.fillStyle = "black";
        context.ctx.font = `bold ${size}px sans-serif`;
        context.ctx.textAlign = "center";
        context.ctx.textBaseline = "middle";
        context.ctx.fillText("?", centerX, centerY);
      }
    }

    context.ctx.restore();
  }

  updateMbr(): void {
    const { left, top, right, bottom } = this.path.getMbr();
    this.mbr.left = left;
    this.mbr.right = right;
    this.mbr.top = top;
    this.mbr.bottom = bottom;
  }

  getPath(): Path {
    return this.path.copy();
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);

    this.updateRenderValues();
    this.transformPath();
    this.updateMbr();
    this.subject.publish(this);
    return this;
  }

  getIsRotating(): boolean {
    return !!this.animationFrameId;
  }

  getType(): DiceType {
    return this.type;
  }

  getRange(): { min: number, max: number } {
    if (this.type === "custom") {
      return { min: 1, max: this.values.length };
    }
    return { min: this.values[0] as number, max: this.values[this.values.length - 1] as number };
  }

  getBackgroundColor(): string {
    return this.backgroundColor;
  }

  getBorderStyle(): string {
    return this.borderStyle;
  }

  getStrokeColor(): string {
    return this.borderColor;
  }

  getStrokeWidth(): number {
    return this.borderWidth;
  }

  private applyBackgroundColor(backgroundColor: string): void {
    this.backgroundColor = backgroundColor;
    this.path.setBackgroundColor(backgroundColor);
  }

  setBackgroundColor(backgroundColor: string): void {
    this.emit(propertyOps.setProperty([this], "backgroundColor", backgroundColor));
  }

  private applyBorderWidth(borderWidth: BorderWidth): void {
    this.borderWidth = borderWidth;
    this.path.setBorderWidth(borderWidth);
  }

  setBorderWidth(borderWidth: BorderWidth): void {
    this.emit(propertyOps.setProperty([this], "borderWidth", borderWidth));
  }

  private applyBorderColor(borderColor: string): void {
    this.borderColor = borderColor;
    this.path.setBorderColor(borderColor);
  }

  setBorderColor(borderColor: string): void {
    this.emit(propertyOps.setProperty([this], "borderColor", borderColor));
  }

  setValues(values: (number | string)[]): void {
    this.emit(propertyOps.setProperty([this], "values", values));
  }

  setValueIndex(valueIndex: number): void {
    this.emit(propertyOps.setProperty([this], "valueIndex", valueIndex));
  }

  throwDice() {
    this.setValueIndex(Math.floor(Math.random() * this.values.length));
  }

  apply(op: Operation | DiceOperation): void {
    switch (op.class) {
      case "Transformation":
        super.apply(op);
        this.transformPath();
        this.updateMbr();
        break;
      case "Dice":
        switch (op.method) {
          case "setBorderWidth":
            this.applyBorderWidth(op.newData.borderWidth);
            break;
          case "setBackgroundColor":
            this.applyBackgroundColor(op.newData.backgroundColor);
            break;
          case "setBorderColor":
            this.applyBorderColor(op.newData.borderColor);
            break;
          case "changeValueIndex":
            if (op.newData.shouldRotate && op.newData.timeStamp && Date.now() - op.newData.timeStamp < 10000) {
              this.startRotation();
              setTimeout(() => {
                this.stopRotation();
                this.valueIndex = op.newData.valueIndex;
              }, TIMEOUT)
            } else {
              this.valueIndex = op.newData.valueIndex;
            }
            break;
          case "changeValues":
            if (!op.newData.values[this.valueIndex]) {
              this.valueIndex = 0;
            }
            this.values = op.newData.values;
            this.updateRenderValues();
            break;
        }
        break;
      default:
        super.apply(op as Operation);
        return;
    }
    this.subject.publish(this);
  }

  protected override onPropertyUpdated(property: string, value: any, prevValue: any): void {
    super.onPropertyUpdated(property, value, prevValue);
    switch (property) {
      case "backgroundColor":
        this.path.setBackgroundColor(value);
        break;
      case "borderColor":
        this.path.setBorderColor(value);
        break;
      case "borderWidth":
        this.path.setBorderWidth(value);
        break;
      case "values":
        this.updateRenderValues();
        break;
    }
  }

  startRotation() {
    if (!this.animationFrameId) {
      const animate = () => {
        if (this.drawingContext) {
          this.subject.publish(this);
          // this.render(this.drawingContext);
          this.animationFrameId = requestAnimationFrame(animate);
        }
      };
      this.animationFrameId = requestAnimationFrame(animate);
    }
  }

  stopRotation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
      this.drawingContext = null;
    }
  }

}

registerItem({
  item: Dice,
  defaultData: defaultDiceData,
  toolData: { name: "AddDice", tool: AddDice, overlay: addDiceToolOverlay },
  overlay: diceOverlay,
});
