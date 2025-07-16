import {BaseItem, BaseItemData, SerializedItemData} from "../../../BaseItem/BaseItem";
import {BorderWidth, Path} from "../../../Path";
import {createRoundedRectanglePath} from "../../../Shape/Basic/RoundedRectangle";
import {Subject} from "../../../../Subject";
import {Board} from "../../../../Board";
import {DrawingContext} from "../../../DrawingContext";
import {DocumentFactory} from "../../../../api/DocumentFactory";
import {DiceOperation} from "./DiceOperation";
import {registerItem} from "../../../RegisterItem";
import {AddDice} from "./AddDice";
import {conf} from "../../../../Settings";

export type DiceType = "common" | "custom";

const TIMEOUT = 2000;

export const defaultDiceData: BaseItemData = {
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

export class Dice extends BaseItem {
  readonly itemType = "Dice";
  private type: DiceType = "common";
  private path: Path;
  readonly subject = new Subject<Dice>();
  private borderWidth = 1;
  valueIndex = 0;
  values: (number | string)[] = [];
  renderValues: Record<number, number | HTMLImageElement> = {};
  private animationFrameId?: number;
  drawingContext: DrawingContext | null = null;

  constructor(board: Board, id = "", type?: DiceType, values?: (number | string)[] ) {
    super(board, id, defaultDiceData);

    if (type) {
      this.type = type;
    }
    if (values) {
      this.values = values;
    }

    this.updateRenderValues();

    this.transformPath();

    this.transformation.subject.subscribe(() => {
      this.transformPath();
      this.updateMbr();
      this.subject.publish(this);
    });

    this.updateMbr();
  }

  private transformPath(): void {
    this.path = createRoundedRectanglePath(this).copy();
    this.path.transform(this.transformation.matrix);

    this.path.setBackgroundColor(this.backgroundColor);
    this.path.setBorderColor(this.borderColor);
    this.path.setBorderWidth(this.borderWidth);
  }

  updateRenderValues(): void {
    this.values.forEach((value, index) => {
      if (typeof value === "number") {
        this.renderValues[index] = value;
      } else {
        const image = conf.documentFactory.createElement("img") as HTMLImageElement;
        image.src = value;
        this.renderValues[index] = image;
        image.onload = () => {
          this.subject.publish(this);
        };
        image.onerror = () => {
          this.renderValues[index] = 1;
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
      const centerX = (mbr.left + mbr.right) / 2;
      const centerY = (mbr.top + mbr.bottom) / 2;
      context.ctx.translate(centerX, centerY);
      context.ctx.rotate(angle);
      context.ctx.translate(-centerX, -centerY);
    }

    this.path.render(context);
    const mbr = this.getMbr();
    const centerX = (mbr.left + mbr.right) / 2;
    const centerY = (mbr.top + mbr.bottom) / 2;

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
    const {left, top, right, bottom} = this.path.getMbr();
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
  }

  getPath(): Path {
    return this.path.copy();
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);

    this.updateRenderValues();
    this.transformPath();
    this.subject.publish(this);
    return this;
  }

  getIsRotating(): boolean {
    return !!this.animationFrameId;
  }

  getType(): DiceType {
    return this.type;
  }

  getRange(): {min: number, max: number} {
    if (this.type === "custom") {
      return {min: 1, max: this.values.length};
    }
    return {min: this.values[0] as number, max: this.values[this.values.length - 1] as number};
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
    this.emit({
      class: "Dice",
      method: "setBackgroundColor",
      item: [this.getId()],
      newData: {backgroundColor},
      prevData: {backgroundColor: this.backgroundColor},
    });
  }

  private applyBorderWidth(borderWidth: BorderWidth): void {
    this.borderWidth = borderWidth;
    this.path.setBorderWidth(borderWidth);
  }

  setBorderWidth(borderWidth: BorderWidth): void {
    this.emit({
      class: "Dice",
      method: "setBorderWidth",
      item: [this.getId()],
      newData: {borderWidth},
      prevData: {borderWidth: this.borderWidth},
    });
  }

  private applyBorderColor(borderColor: string): void {
    this.borderColor = borderColor;
    this.path.setBorderColor(borderColor);
  }

  setBorderColor(borderColor: string): void {
    this.emit({
      class: "Dice",
      method: "setBorderColor",
      item: [this.getId()],
      newData: {borderColor},
      prevData: {borderColor: this.borderColor}
    });
  }

  setValues(values: number[]): void {
    this.emit({
      class: "Dice",
      method: "changeValues",
      item: [this.getId()],
      newData: {values},
      prevData: {values: this.values},
    });
  }

  setValueIndex(valueIndex: number): void {
    this.emit({
      class: "Dice",
      method: "changeValueIndex",
      item: [this.getId()],
      newData: {valueIndex, shouldRotate: true, timeStamp: Date.now()},
      prevData: {value: this.valueIndex, shouldRotate: false}
    });
  }

  throwDice() {
    this.setValueIndex(Math.floor(Math.random() * this.values.length));
  }

  apply(op: DiceOperation): void {
    super.apply(op);
    switch (op.class) {
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
    }
    this.subject.publish(this);
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
  toolData: {name: "AddDice", tool: AddDice},
});
