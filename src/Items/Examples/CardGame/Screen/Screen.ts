import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { Subject } from "Subject";
import { registerItem } from "Items/RegisterItem";
import { DrawingContext } from "Items/DrawingContext";
import {BorderWidth, Path} from "../../../Path";
import {Line} from "../../../Line";
import {Point} from "../../../Point";
import {AddScreen} from "./AddScreen";
import {ScreenOperation} from "./ScreenOperation";
import {DocumentFactory} from "api/DocumentFactory";

const screenPath = new Path(
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

export const defaultScreenData: BaseItemData = {
  itemType: "Screen",
  ownerId: "",
  backgroundUrl: ""
};

export class Screen extends BaseItem {
  readonly subject = new Subject<Screen>();
  private path: Path;
  private borderWidth = 1;
  backgroundColor = "#FFFFFF";
  backgroundUrl = "";
  backgroundImage: HTMLImageElement | null = null;

  constructor(
    board: Board,
    id = "",
    private ownerId = "",
  ) {
    super(board, id, defaultScreenData, true);

    this.transformation.subject.subscribe(() => {
      this.transformPath();
      this.updateMbr();
      this.subject.publish(this);
    });
    this.transformPath();
    this.updateMbr();
  }

  apply(op: ScreenOperation): void {
    super.apply(op);
    switch (op.class) {
      case "Screen":
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
          case "setBackgroundUrl":
            this.applyBackgroundUrl(op.newData.backgroundUrl);
            break;
        }
        break;
    }
    this.subject.publish(this);
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
      class: "Screen",
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
      class: "Screen",
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
      class: "Screen",
      method: "setBorderColor",
      item: [this.getId()],
      newData: {borderColor},
      prevData: {borderColor: this.borderColor}
    });
  }

  private applyBackgroundUrl(url?: string): void {
    this.backgroundUrl = url || "";
    if (url) {
      this.backgroundImage = new Image();
      this.backgroundImage.src = url;
      this.applyBackgroundColor("none");
    } else {
      this.backgroundImage = null;
    }
  }

  setBackgroundUrl(url?: string): void {
    this.emit({
      class: "Screen",
      method: "setBackgroundUrl",
      item: [this.getId()],
      newData: {backgroundUrl: url},
      prevData: {backgroundUrl: this.backgroundUrl}
    });
  }

  applyOwnerId(ownerId: string): void {
    this.ownerId = ownerId;
  }

  private transformPath(): void {
    this.path = screenPath.copy();
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
    if (this.backgroundImage && this.backgroundImage.complete) {
      const ctx = context.ctx;
      ctx.save();
      this.transformation.matrix.applyToContext(ctx);
      ctx.drawImage(this.backgroundImage, 0, 0, this.getWidth(), this.getHeight());
      ctx.restore();
    }
    this.path.render(context);
    if (
      localStorage.getItem("currentUser") === this.ownerId
      || localStorage.getItem("screenOwnerId") === this.ownerId
      || !this.ownerId
    ) {
      super.render(context);
    }
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = super.renderHTML(documentFactory);
    div.style.backgroundColor = this.backgroundColor;
    div.style.borderColor = this.borderColor;
    div.style.borderWidth = `${this.borderWidth}px`;
    div.style.borderStyle = this.borderStyle;
    return div;
  }
}

registerItem({
  item: Screen,
  defaultData: defaultScreenData,
  toolData: {name: "AddScreen", tool: AddScreen}
});
