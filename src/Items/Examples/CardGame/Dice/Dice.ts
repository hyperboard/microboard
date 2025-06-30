import {BaseItem, BaseItemData, SerializedItemData} from "../../../BaseItem/BaseItem";
import {BorderWidth, Path} from "../../../Path";
import {createRoundedRectanglePath} from "../../../Shape/Basic/RoundedRectangle";
import {Subject} from "../../../../Subject";
import {Board} from "../../../../Board";
import {DrawingContext} from "../../../DrawingContext";
import {DocumentFactory} from "../../../../api/DocumentFactory";
import {DiceOperation} from "./DiceOperation";
import {registerItem} from "../../../RegisterItem";
import {ShapeTool} from "../../../../Tools/CustomTool";
import {AddDice} from "./AddDice";

const TIMEOUT = 3000;

export const defaultDiceData: BaseItemData = {
  itemType: "Dice",
  backgroundColor: "#000207",
  backgroundOpacity: 1,
  borderColor: "#000207",
  borderOpacity: 1,
  borderStyle: "solid",
  borderWidth: 1,
  value: 1,
  range: {min: 1, max: 6}
};

export class Dice extends BaseItem {
  readonly itemType = "Dice";
  private path: Path;
  readonly subject = new Subject<Dice>();
  private borderWidth = 1;
  isRotating = false;
  value = 1;
  range = {min: 1, max: 6};

  constructor(board: Board, id = "") {
    super(board, id, defaultDiceData);
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

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }

    context.ctx.save();

    if (this.isRotating) {
      const now = Date.now();
      const angle = ((now % 1000) / 1000) * 2 * Math.PI;
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

    context.ctx.fillStyle = "black";
    context.ctx.font = `bold ${this.getHeight() / 3}px sans-serif`;
    context.ctx.textAlign = "center";
    context.ctx.textBaseline = "middle";
    context.ctx.fillText(String(this.value), centerX, centerY);

    if (this.getLinkTo()) {
      const {top, right} = this.getMbr();
      this.linkTo.render(
        context,
        top,
        right,
        this.board.camera.getScale(),
      );
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

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("dice-item");

    return div;
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);

    this.transformPath();
    this.subject.publish(this);
    return this;
  }

  isClosed(): boolean {
    return true;
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

  setIsRotating(isRotating: boolean): void {
    this.emit({
      class: "Dice",
      method: "setIsRotating",
      item: [this.getId()],
      newData: {isRotating},
      prevData: {isRotating: false}
    });
  }

  setValuesRange(range: {min: number, max: number}): void {
    this.emit({
      class: "Dice",
      method: "changeValuesRange",
      item: [this.getId()],
      newData: range,
      prevData: this.range
    });
  }

  setValue(value: number): void {
    this.emit({
      class: "Dice",
      method: "changeValue",
      item: [this.getId()],
      newData: {value},
      prevData: {value: this.value}
    });
  }

  throwDice() {
    this.setIsRotating(true);
    setTimeout(() => {
      this.setValue(Math.ceil(Math.random() * (this.range.max - this.range.min)) + this.range.min);
      this.isRotating = false;
    }, TIMEOUT)
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
          case "setIsRotating":
            this.isRotating = op.newData.isRotating;
            if (op.newData.isRotating) {
              setTimeout(() => {
                this.isRotating = false;
              }, TIMEOUT)
            }
            break;
          case "changeValue":
            this.value = op.newData.value;
            this.isRotating = false;
            break;
          case "changeValuesRange":
            this.range = op.newData;
            break;
        }
        break;
    }
    this.subject.publish(this);
  }
}

registerItem({
  item: Dice,
  defaultData: defaultDiceData,
  toolData: {name: "AddDice", tool: AddDice},
});
