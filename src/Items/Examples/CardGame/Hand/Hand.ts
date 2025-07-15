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
import {Path} from "../../../Path";
import {Line} from "../../../Line";
import {Point} from "../../../Point";
import {AddHand} from "./AddHand";

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

  apply(op: DeckOperation): void {
    super.apply(op);
    this.subject.publish(this);
  }

  applyOwnerId(ownerId: string): void {
    this.ownerId = ownerId;
  }

  private transformPath(): void {
    this.path = handPath.copy();
    this.path.transform(this.transformation.matrix);

    this.path.setBackgroundColor(this.backgroundColor);
    this.path.setBorderColor(this.borderColor);
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
