import {
  BaseItem,
  BaseItemData,
  SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { Subject } from "Subject";
import {registerItem, registerTool} from "Items/RegisterItem";
import { DrawingContext } from "Items/DrawingContext";
import {BorderWidth, Path, BorderStyle} from "../../../Path";
import {Line} from "../../../Line";
import {Point} from "../../../Point";
import {AddPouch, AddScreen} from "./AddScreen";
import {ScreenOperation} from "./ScreenOperation";
import {DocumentFactory} from "api/DocumentFactory";
import {conf} from "Settings";
import {getMediaSignedUrl} from "api/MediaHelpers";

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

export interface ScreenData extends BaseItemData {
  ownerId?: string;
  backgroundUrl?: string;
}

export const defaultScreenData: ScreenData = {
  itemType: "Screen",
  ownerId: "",
  backgroundUrl: ""
};

export class Screen extends BaseItem<Screen> {
  readonly subject = new Subject<Screen>();
  private path: Path;
  private borderWidth = 1;
  backgroundColor = "#FFFFFF";
  public borderColor = "#000000";
  public borderStyle: BorderStyle = "solid";
  backgroundUrl = "";
  backgroundImage: HTMLImageElement | null = null;
  ownerId = "";

  constructor(
    board: Board,
    id = "",
    defaultItemData?: BaseItemData,
    isGroupItem?: boolean,
  ) {
    super(board, id, defaultItemData || defaultScreenData, true);
    const data = (defaultItemData || defaultScreenData) as ScreenData;
    this.ownerId = data.ownerId || "";
    this.path = new Path(); // use a dummy path, it will be reassigned in transformPath

    this.transformPath();
    this.updateMbr();
  }

  apply(op: any): void {
    super.apply(op);
    switch (op.class) {
      case "Transformation":
        this.transformPath();
        this.updateMbr();
        break;
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

  getOwnerId(): string {
    return this.ownerId;
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

  private async applyBackgroundUrl(url?: string): Promise<void> {
    this.backgroundUrl = url || "";
    if (url) {
      this.backgroundImage = conf.documentFactory.createElement("img") as HTMLImageElement;
      this.backgroundImage.src = await getMediaSignedUrl(url) || "";
      this.applyBackgroundColor("none");
      this.backgroundImage.onload = () => {
        this.subject.publish(this);
      };
      this.backgroundImage.onerror = () => {
        this.backgroundImage = null;
        this.subject.publish(this);
      };
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
    if (!this.ownerId) {
      this.index!.listUnderPoint = () => []
      this.index!.listEnclosedBy = () => []
      this.index!.listEnclosedOrCrossedBy = () => []
    }
  }

  private transformPath(): void {
    this.path = screenPath.copy();
    this.path.transform(this.transformation.toMatrix());

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
    if (this.backgroundUrl) {
      this.applyBackgroundUrl(this.backgroundUrl);
    }
    if (!this.ownerId) {
      this.index!.listUnderPoint = () => []
      this.index!.listEnclosedBy = () => []
      this.index!.listEnclosedOrCrossedBy = () => []
    }
    this.transformPath();
    this.subject.publish(this);
    return this;
  }

  getRandomItem(): BaseItem | undefined {
    const items = this.index?.listAll() || [];
    const item = items[Math.floor(Math.random() * items.length)] as BaseItem | undefined;
    if (item) {
      this.removeChildItems(item);
      return item;
    }
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    if (this.backgroundImage && this.backgroundImage.complete && this.backgroundImage.naturalWidth > 0) {
      const ctx = context.ctx;
      ctx.save();
      ctx.drawImage(this.backgroundImage, this.left, this.top, this.getWidth(), this.getHeight());
      ctx.restore();
    }
    this.path.render(context);
    if (
      localStorage.getItem("currentUser") === this.ownerId
      || localStorage.getItem("screenOwnerId") === this.ownerId
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
    if (this.backgroundUrl) {
      div.style.backgroundSize = "cover";
      div.style.backgroundImage = `url(${this.backgroundUrl})`
    }
    return div;
  }
}

registerItem({
  item: Screen,
  defaultData: defaultScreenData,
  toolData: {name: "AddScreen", tool: AddScreen}
});

registerTool({name: "AddPouch", tool: AddPouch})
