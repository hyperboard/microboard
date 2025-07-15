import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { Subject } from "Subject";
import { registerItem } from "Items/RegisterItem";
import { DrawingContext } from "Items/DrawingContext";
import { DeckOperation } from "Items/Examples/CardGame/Deck/DeckOperation";
import {BorderWidth, Path} from "../../../Path";
import {Line} from "../../../Line";
import {Point} from "../../../Point";
import {AddHand} from "./AddHand";
import {HandOperation} from "./HandOperation";

const handPath = new Path(
  [
    new Line(new Point(0, 0), new Point(100, 0)),
    new Line(new Point(100, 0), new Point(100, 100)),
    new Line(new Point(100, 100), new Point(0, 100)),
    new Line(new Point(0, 100), new Point(0, 0)),
  ],
  true,
  "#FFFFFF",
  "#000000"
)

export const defaultHandData: BaseItemData = {
  itemType: "Hand",
  ownerId: "",
};

export class Hand extends BaseItem {
  readonly subject = new Subject<Hand>();
  private path: Path;
  private borderWidth = 1;
  backgroundColor = "#FFFFFF";

  constructor(
    board: Board,
    id = "",
    private ownerId = "",
  ) {
    super(board, id, defaultHandData, true);

    this.transformation.subject.subscribe(() => {
      this.transformPath();
      this.updateMbr();
      this.subject.publish(this);
    });
    this.transformPath();
    this.updateMbr();
  }

  apply(op: HandOperation): void {
    super.apply(op);
    switch (op.class) {
      case "Hand":
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
        }
        break;
    }
    this.subject.publish(this);
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

  applyOwnerId(ownerId: string): void {
    this.ownerId = ownerId;
  }

  private transformPath(): void {
    this.path = handPath.copy();
    this.path.transform(this.transformation.matrix);

    this.path.setBackgroundColor(this.backgroundColor);
    this.path.setBorderColor(this.borderColor);
    this.path.setBorderWidth(this.borderWidth);
  }

  updateMbr(): void {
    const {left, top, right, bottom} = this.path.getMbr();
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
  }

  deserialize(data: SerializedItemData): this {
    super.deserialize(data);
    this.transformPath();
    this.subject.publish(this);
    return this;
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    this.path.render(context);
    if (localStorage.getItem("currentUser") === this.ownerId || !this.ownerId) {
      super.render(context);
    }
  }
}

registerItem({
  item: Hand,
  defaultData: defaultHandData,
  toolData: {name: "AddHand", tool: AddHand}
});
