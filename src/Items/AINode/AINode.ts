import { Board } from "Board";
import { DocumentFactory } from "api/DocumentFactory";
import { Operation } from "Events/EventsOperations";
import {
  positionRelatively,
  resetElementScale,
  scaleElementBy,
  translateElementBy,
} from "HTMLRender/HTMLRender";
import { AINodeData, createNodePath } from "Items/AINode/AINodeData";
import { DrawingContext } from "Items/DrawingContext";
import { GeometricNormal } from "Items/GeometricNormal";
import { Geometry } from "Items/Geometry";
import { Line } from "Items/Line/Line";
import { LinkTo } from "Items/LinkTo/LinkTo";
import { Mbr } from "Items/Mbr/Mbr";
import { LinePatterns, Path } from "Items/Path/Path";
import { Paths } from "Items/Path/Paths";
import { Point } from "Items/Point/Point";
import { RichText } from "Items/RichText/RichText";
import { Matrix } from "Items/Transformation/Matrix";
import { Transformation } from "Items/Transformation/Transformation";
import { TransformationOperation } from "Items/Transformation/TransformationOperations";
import { conf } from "Settings";
import { Subject } from "Subject";
import { BaseItem } from "Items/BaseItem/BaseItem";

export const CONTEXT_NODE_HIGHLIGHT_COLOR = "rgba(183, 138, 240, 1)";
const BUTTON_SIZE = 20;
export type ThreadDirection = 0 | 1 | 2 | 3;
// TODO FIX node
// const arrowIcon = new Image();
const ICON_SRC =
  "data:image/svg+xml;charset=utf-8,%3Csvg id='AIChatSendArrow' viewBox='0 0 21 21' xmlns='http://www.w3.org/2000/svg' fill='url(%23paint0_linear_7542_32550)'%3E%3Cpath d='M0.946815 7.31455C0.424815 7.14055 0.419815 6.85955 0.956815 6.68055L20.0438 0.318552C20.5728 0.142552 20.8758 0.438552 20.7278 0.956552L15.2738 20.0426C15.1238 20.5716 14.8188 20.5896 14.5948 20.0876L11.0008 11.9996L17.0008 3.99955L9.00081 9.99955L0.946815 7.31455Z'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear_7542_32550' x1='10.66' y1='0.267578' x2='10.66' y2='20.452' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23CD4FF2'/%3E%3Cstop offset='1' stop-color='%235F4AFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";
// arrowIcon.src = ICON_SRC;

export class AINode extends BaseItem {
  readonly itemType = "AINode";
  parent = "Board";
  readonly transformation: Transformation;
  readonly text: RichText;
  readonly linkTo: LinkTo;
  private path: Paths | Path;
  readonly subject = new Subject<AINode>();
  private parentNodeId?: string;
  private isUserRequest: boolean;
  private contextItems: string[] = [];
  private threadDirection: ThreadDirection = 3;
  private contextRange = 5;
  transformationRenderBlock?: boolean = undefined;
  private buttonMbr: Mbr = new Mbr();
  private buttonIcon: HTMLImageElement;
  prevMbr: Mbr | null = null;

  constructor(
    board: Board,
    isUserRequest = false,
    parentNodeId?: string,
    contextItems: string[] = [],
    threadDirection?: ThreadDirection,
    private id = ""
  ) {
    super(board, id);
    this.buttonIcon = conf.documentFactory.createElement(
      "img"
    ) as HTMLImageElement;
    this.buttonIcon.src = ICON_SRC;
    this.contextItems = contextItems;
    this.isUserRequest = isUserRequest;
    this.parentNodeId = parentNodeId;
    if (threadDirection || threadDirection === 0) {
      this.threadDirection = threadDirection;
    }
    this.transformation = new Transformation(this.id, this.board.events);
    this.linkTo = new LinkTo(this.id, this.board.events);
    this.text = new RichText(
      this.board,
      new Mbr(),
      this.id,
      this.transformation,
      this.linkTo,
      "\u00A0",
      false,
      false,
      "AINode"
    );

    // this.text.setPaddingTop(0.5);

    this.transformation.subject.subscribe(
      (_subject: Transformation, op: TransformationOperation) => {
        if (op.method === "translateTo" || op.method === "translateBy") {
          this.text.transformCanvas();
        } else if (op.method === "transformMany") {
          const currItemOp = op.items[this.getId()];
          this.prevMbr = this.path?.getMbr();
          if (
            currItemOp.method === "translateBy" ||
            currItemOp.method === "translateTo" ||
            (currItemOp.method === "scaleByTranslateBy" &&
              currItemOp.scale.x === 1 &&
              currItemOp.scale.y === 1)
          ) {
            // translating
            this.text.transformCanvas();
          } else {
            // scaling
            this.text.handleInshapeScale();
          }
        } else {
          this.prevMbr = this.path?.getMbr();
          if (op.method === "scaleByTranslateBy") {
            this.text.handleInshapeScale();
          } else {
            this.text.updateElement();
          }
        }
        this.transformPath();
        this.subject.publish(this);
      }
    );
    this.text.subject.subscribe(() => {
      this.prevMbr = this.path?.getMbr();
      this.transformPath();
      this.subject.publish(this);
    });
    this.text.transformation.subject.subscribe(() => {
      this.prevMbr = this.path?.getMbr();
      this.transformPath();
      this.subject.publish(this);
    });

    this.linkTo.subject.subscribe(() => {
      this.subject.publish(this);
    });
    this.text.insideOf = "AINode";

    this.transformPath();
  }

  transformPath(): void {
    const { left, right, top, bottom } = this.text.getTransformedContainer();
    const { scaleX, scaleY } = this.transformation.matrix;
    const minScale = Math.min(scaleX, scaleY);
    const leftOffset = 20 * minScale;
    const topOffset = 20 * minScale;
    const nodeRight = right + 80 * minScale;
    const nodeBottom = bottom + (bottom - top > 400 ? 60 : 40) * minScale;
    if (
      !this.path ||
      (this.text.left < this.path.getMbr().left + leftOffset &&
        this.text.top < this.path.getMbr().top + topOffset)
    ) {
      this.text.left = this.transformation.matrix.translateX + leftOffset;
      this.text.top = this.transformation.matrix.translateY + topOffset;
    }

    this.path = createNodePath(
      new Mbr(left, top, nodeRight, nodeBottom),
      this.transformation.matrix
    );
    const scaledSize = BUTTON_SIZE * minScale;

    this.buttonMbr = new Mbr(
      nodeRight - scaledSize * 2,
      nodeBottom - scaledSize * 2,
      nodeRight - scaledSize,
      nodeBottom - scaledSize
    );
  }

  serialize(isCopy = false): AINodeData {
    return {
      itemType: "AINode",
      transformation: this.transformation.serialize(),
      text: this.text.serialize(),
      linkTo: this.linkTo.serialize(),
      parentNodeId: isCopy ? undefined : this.parentNodeId,
      isUserRequest: this.isUserRequest,
      contextItems: this.contextItems,
      threadDirection: this.threadDirection,
    };
  }

  deserialize(data: Partial<AINodeData>): this {
    if (data.text) {
      this.text.deserialize(data.text);
    }
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
    }
    this.linkTo.deserialize(data.linkTo);
    if (data.isUserRequest) {
      this.isUserRequest = data.isUserRequest;
    }
    if (data.contextItems) {
      this.contextItems = data.contextItems;
    }
    if (data.threadDirection || data.threadDirection === 0) {
      this.threadDirection = data.threadDirection;
    }

    this.parentNodeId = data.parentNodeId;
    this.transformPath();
    this.subject.publish(this);
    return this;
  }

  setId(id: string): this {
    this.id = id;
    this.text.setId(id);
    this.transformation.setId(id);
    this.linkTo.setId(id);
    return this;
  }

  getId(): string {
    return this.id;
  }

  getContextItems(): string[] {
    return this.contextItems;
  }

  // setParentId(id: string): void {
  //     this.parentNodeId = id;
  // }

  getThreadDirection(): ThreadDirection {
    return this.threadDirection;
  }

  getContextRange(): number {
    return this.contextRange;
  }

  getParentId(): string | undefined {
    return this.parentNodeId;
  }

  getIsUserRequest(): boolean {
    return this.isUserRequest;
  }

  isClosed(): boolean {
    return true;
  }

  getPath(): Path | Paths {
    const copy = this.path.copy();
    copy.setBackgroundColor("none");
    return copy;
  }

  apply(op: Operation): void {
    switch (op.class) {
      case "RichText":
        this.text.apply(op);
        break;
      case "Transformation":
        this.text.transformation.apply(op);
        break;
      case "LinkTo":
        this.linkTo.apply(op);
        break;
      default:
        return;
    }
    this.subject.publish(this);
  }

  getSnapAnchorPoints(): Point[] {
    const mbr = this.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    return [
      new Point(mbr.left + width / 2, mbr.top),
      new Point(mbr.left + width / 2, mbr.bottom),
      new Point(mbr.left, mbr.top + height / 2),
      new Point(mbr.right, mbr.top + height / 2),
    ];
  }

  getButtonMbr() {
    return this.buttonMbr;
  }

  getDistanceToPoint(point: Point): number {
    const nearest = this.getNearestEdgePointTo(point);
    return point.getDistance(nearest);
  }

  getIntersectionPoints(segment: Line): Point[] {
    throw new Error("Not implemented");
  }

  getMbr(): Mbr {
    return this.path.getMbr();
  }

  getNearestEdgePointTo(point: Point): Point {
    return this.path.getNearestEdgePointTo(point);
  }

  getNormal(point: Point): GeometricNormal {
    return this.path.getNormal(point);
  }

  isEnclosedBy(rect: Mbr): boolean {
    return this.path.isEnclosedBy(rect);
  }

  isEnclosedOrCrossedBy(rect: Mbr): boolean {
    return this.path.isEnclosedOrCrossedBy(rect);
  }

  isInView(rect: Mbr): boolean {
    return this.isEnclosedOrCrossedBy(rect);
  }

  isNearPoint(point: Point, distance: number): boolean {
    return distance > this.getDistanceToPoint(point);
  }

  isUnderPoint(point: Point, tolerance = 5): boolean {
    return this.path.isUnderPoint(point);
  }

  getRichText(): RichText {
    return this.text;
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  renderButton(context: DrawingContext): void {
    const { left, right, top, bottom } = this.buttonMbr;
    const { ctx } = context;

    ctx.save();

    if (this.buttonIcon.complete) {
      ctx.drawImage(this.buttonIcon, left, top, right - left, bottom - top);
    }

    ctx.restore();
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    // this.text.setPaddingTop(0.5);
    // this.renderShadow(context);
    this.path.render(context);
    this.renderButton(context);
    this.text.render(context);
    if (this.getLinkTo()) {
      const { top, right } = this.getMbr();
      this.linkTo.render(context, top, right, this.board.camera.getScale());
    }
  }
  // smell have to redo without document
  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("ainode-item");

    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.matrix;
    const mbr = this.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    const unscaledWidth = width;
    const unscaledHeight = height;
    const transform = `translate(${Math.round(translateX)}px, ${Math.round(
      translateY
    )}px)`;

    const svg = documentFactory.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("width", `${unscaledWidth}px`);
    svg.setAttribute("height", `${unscaledHeight}px`);
    svg.setAttribute("viewBox", `0 0 ${unscaledWidth} ${unscaledHeight}`);
    svg.setAttribute("transform-origin", "0 0");
    svg.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);
    svg.setAttribute("style", "position: absolute; overflow: visible;");

    const pathElement = createNodePath(
      this.getMbr(),
      new Matrix(0, 0, scaleX, scaleY)
    )
      .copy()
      .renderHTML(documentFactory);
    const paths = Array.isArray(pathElement) ? pathElement : [pathElement];
    paths.forEach((element) => {
      element.setAttribute("fill", "rgb(255, 255, 255)");
      element.setAttribute("stroke", "rgba(222, 224, 227, 1)");
      element.setAttribute(
        "stroke-dasharray",
        LinePatterns["solid"].join(", ")
      );
      element.setAttribute("stroke-width", "1");
      element.setAttribute("transform-origin", "0 0");
      element.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);
    });
    svg.append(...paths);
    div.appendChild(svg);

    div.id = this.getId();
    div.style.width = `${unscaledWidth}px`;
    div.style.height = `${unscaledHeight}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    if (this.parentNodeId) {
      div.setAttribute("parent-node-id", this.parentNodeId);
    }
    if (this.isUserRequest) {
      div.setAttribute("is-user-request", "true");
    }
    if (this.contextItems.length) {
      div.setAttribute("context-items", this.contextItems.join(","));
    }
    div.setAttribute("context-range", this.contextRange.toString());

    const button = documentFactory.createElement("button");
    button.style.position = "absolute";
    button.style.cursor = "pointer";
    const img = documentFactory.createElement("img");
    img.setAttribute("src", ICON_SRC);
    img.setAttribute("alt", "#");
    img.setAttribute("width", `${BUTTON_SIZE}px`);
    img.setAttribute("height", `${BUTTON_SIZE}px`);
    button.style.background = "none";
    button.style.border = "none";
    button.style.outline = "none";
    button.style.cursor = "pointer";
    button.setAttribute("width", `${BUTTON_SIZE}px`);
    button.setAttribute("height", `${BUTTON_SIZE}px`);
    button.appendChild(img);
    translateElementBy(
      button,
      width - BUTTON_SIZE * scaleX * 2,
      height - BUTTON_SIZE * scaleY * 2
    );
    scaleElementBy(button, scaleX, scaleY);
    div.appendChild(button);

    const textElement = this.text.renderHTML(documentFactory);
    textElement.id = `${this.getId()}_text`;
    const maxWidth = this.text.getMaxWidth();
    if (maxWidth) {
      textElement.style.width = `${maxWidth}px`;
    } else {
      textElement.style.width = "600px";
    }
    textElement.style.removeProperty("height");
    textElement.style.overflow = "auto";
    positionRelatively(textElement, div);
    translateElementBy(textElement, 20 * scaleX, 20 * scaleY);

    div.setAttribute("data-link-to", this.linkTo.serialize() || "");
    if (this.getLinkTo()) {
      const linkElement = this.linkTo.renderHTML(documentFactory);
      resetElementScale(linkElement);
      translateElementBy(
        linkElement,
        width - parseInt(linkElement.style.width),
        0
      );
      div.appendChild(linkElement);
    }

    div.appendChild(textElement);

    return div;
  }

  getPrevMbr(): Mbr | null {
    return this.prevMbr;
  }
}
