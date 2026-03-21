import {BaseItem, BaseItemData, SerializedItemData} from "../../../BaseItem/BaseItem";
import {BorderWidth, LinePatterns, Path, Shapes, BorderStyle, Point} from "Items";
import {createRoundedRectanglePath} from "Items/Shape/Basic/RoundedRectangle";
import {Subject} from "Subject";
import {Board} from "Board";
import {DrawingContext} from "Items";
import {DocumentFactory} from "../../../../api/DocumentFactory";
import {DiceOperation} from "./DiceOperation";
import {registerItem} from "Items";
import {AddDice} from "./AddDice";
import {conf} from "Settings";
import {getMediaSignedUrl} from "api/MediaHelpers";

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

export class Dice extends BaseItem {
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
    defaultItemData?: BaseItemData,
    isGroupItem?: boolean
  ) {
    super(board, id, defaultItemData || defaultDiceData, isGroupItem);
    this.path = createRoundedRectanglePath(this).copy(); // definitely assign it

    const data = (defaultItemData || defaultDiceData) as DiceData;
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

    this.transformation.subject.subscribe(() => {
      this.transformPath();
      this.updateMbr();
      this.subject.publish(this);
    });

    this.updateMbr();
  }

  private transformPath(): void {
    this.path = createRoundedRectanglePath(this).copy();
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
        image.src = await getMediaSignedUrl(value, this.board.getAccount()?.accessToken || null) || "";
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

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = super.renderHTML(documentFactory);
    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.getMatrixData();
    const mbr = this.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    const unscaledWidth = width / scaleX;
    const unscaledHeight = height / scaleY;

    const svg = documentFactory.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("width", `${unscaledWidth}px`);
    svg.setAttribute("height", `${unscaledHeight}px`);
    svg.setAttribute("viewBox", `0 0 ${unscaledWidth} ${unscaledHeight}`);
    svg.setAttribute("transform-origin", "0 0");
    svg.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);
    svg.setAttribute("style", "position: absolute; overflow: visible;");

    const pathElement = Shapes["RoundedRectangle"].path
      .copy()
      .renderHTML(documentFactory);
    const paths = Array.isArray(pathElement) ? pathElement : [pathElement];
    paths.forEach((element) => {
      element.setAttribute("fill", this.backgroundColor);
      element.setAttribute("stroke", this.borderColor);
      element.setAttribute(
        "stroke-dasharray",
        LinePatterns[this.borderStyle].join(", ")
      );
      element.setAttribute("stroke-width", this.borderWidth.toString());
      element.setAttribute("transform-origin", "0 0");
      element.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);
    });
    svg.append(...paths);
    div.appendChild(svg);

    div.id = this.getId();
    div.style.width = unscaledWidth + "px";
    div.style.height = unscaledHeight + "px";
    div.style.transformOrigin = "left top";
    div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.position = "absolute";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.textAlign = "center";
    div.style.justifyContent = "center";
    div.style.backgroundColor = "transparent";

    const innerDiv = document.createElement("div") as HTMLDivElement;
    innerDiv.style.font = `bold ${unscaledWidth / 3}px sans-serif`;
    innerDiv.style.width = `${unscaledWidth / 3}px`
    innerDiv.style.height = `${unscaledHeight / 3}px`
    innerDiv.style.position = "relative";

    const valueToRender = this.renderValues[this.valueIndex];
    if (typeof valueToRender === "number") {
      innerDiv.innerHTML = valueToRender.toString();
    } else {
      innerDiv.style.backgroundImage = `url(${valueToRender.src})`;
      innerDiv.style.backgroundSize = "cover";
    }
    div.appendChild(innerDiv);
    return div;
  }
}

registerItem({
  item: Dice,
  defaultData: defaultDiceData,
  toolData: {name: "AddDice", tool: AddDice},
});
