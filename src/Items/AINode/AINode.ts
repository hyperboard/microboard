import { Board } from "Board";
import { DocumentFactory } from "api/DocumentFactory";
import { Operation } from "Events/EventsOperations";
import {
  positionRelatively,
  resetElementScale,
  scaleElementBy,
  translateElementBy,
} from "HTMLRender/HTMLRender";
import { AINodeData, createNodePath } from "./AINodeData";
import { DrawingContext } from "../DrawingContext";
import { GeometricNormal } from "../GeometricNormal";
import { Geometry } from "../Geometry";
import { Line } from "../Line/Line";
import { LinkTo } from "../LinkTo/LinkTo";
import { Mbr } from "../Mbr/Mbr";
import { LinePatterns, Path } from "../Path/Path";
import { Paths } from "../Path/Paths";
import { Point } from "../Point/Point";
import { RichText } from "../RichText/RichText";
import { Matrix } from "../Transformation/Matrix";
import { Transformation } from "../Transformation/Transformation";
import { TransformationOperation } from "../Transformation/TransformationOperations";
import { conf } from "Settings";
import { Subject } from "Subject";
import { BaseItem, SerializedItemData } from "../BaseItem/BaseItem";
import { TransformParams, TransformResult } from "../BaseItem/TransformContext";
import { transformAINode } from "Selection/Transformer/TransformerHelpers/transformAINode";
import { registerItem } from "Items/RegisterItem";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import { DefaultRichTextData } from "../RichText/RichTextData";

export const CONTEXT_NODE_HIGHLIGHT_COLOR = "rgba(183, 138, 240, 1)";
const BUTTON_SIZE = 20;
export const threadDirections = [0, 1, 2, 3] as const;
export type ThreadDirection = typeof threadDirections[number];
// TODO FIX node
// const arrowIcon = new Image();
const ICON_SRC =
  "data:image/svg+xml;charset=utf-8,%3Csvg id='AIChatSendArrow' viewBox='0 0 21 21' xmlns='http://www.w3.org/2000/svg' fill='url(%23paint0_linear_7542_32550)'%3E%3Cpath d='M0.946815 7.31455C0.424815 7.14055 0.419815 6.85955 0.956815 6.68055L20.0438 0.318552C20.5728 0.142552 20.8758 0.438552 20.7278 0.956552L15.2738 20.0426C15.1238 20.5716 14.8188 20.5896 14.5948 20.0876L11.0008 11.9996L17.0008 3.99955L9.00081 9.99955L0.946815 7.31455Z'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear_7542_32550' x1='10.66' y1='0.267578' x2='10.66' y2='20.452' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23CD4FF2'/%3E%3Cstop offset='1' stop-color='%235F4AFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";
// arrowIcon.src = ICON_SRC;

export class AINode extends BaseItem<AINode> {
  readonly itemType = "AINode";
  parent = "Board";
  readonly text: RichText;
  private path!: Paths | Path;
  readonly subject = new Subject<AINode>();
  private parentNodeId?: string;
  private isUserRequest!: boolean;
  private contextItems: string[] = [];
  private threadDirection: ThreadDirection = 3;
  private contextRange = 5;
  transformationRenderBlock?: boolean = undefined;
  private buttonMbr: Mbr = new Mbr();
  private buttonIcon: HTMLImageElement;
  prevMbr: Mbr | null = null;

  constructor(
    board: Board,
    id = ""
  ) {
    super(board, id);
    this.buttonIcon = conf.documentFactory.createElement(
      "img"
    ) as HTMLImageElement;
    this.buttonIcon.src = ICON_SRC;
    this.text = new RichText(this.board, this.id);
    this.text.container = new Mbr();
    this.text.transformation = this.transformation;
    this.text.linkTo = this.linkTo;
    this.text.placeholderText = "\u00A0";
    this.text.isInShape = false;
    this.text.insideOf = "AINode";
    this.text.updateShrinkWidth();

    // this.text.setPaddingTop(0.5);

    this.text.subject.subscribe(() => {
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
    const { scaleX, scaleY, translateX: nodeTranslateX, translateY: nodeTranslateY } = this.transformation.getMatrixData();
    const minScale = Math.min(scaleX, scaleY);
    const leftOffset = 20 * minScale;
    const topOffset = 20 * minScale;
    const nodeRight = right + 80 * minScale;
    const nodeBottom = bottom + (bottom - top > 400 ? 60 : 40) * minScale;
    if (
      !this.path ||
      (this.text.getMbr().left < this.path.getMbr().left + leftOffset &&
        this.text.getMbr().top < this.path.getMbr().top + topOffset)
    ) {
      const textMbr = this.text.getMbr();
      textMbr.left = nodeTranslateX + leftOffset;
      textMbr.top = nodeTranslateY + topOffset;
      this.text.setMbr(textMbr);
    }

    this.path = createNodePath(
      new Mbr(left, top, nodeRight, nodeBottom),
      this.transformation.toMatrix()
    );
    const scaledSize = BUTTON_SIZE * minScale;

    this.buttonMbr = new Mbr(
      nodeRight - scaledSize * 2,
      nodeBottom - scaledSize * 2,
      nodeRight - scaledSize,
      nodeBottom - scaledSize
    );
  }

  serialize(): SerializedItemData<AINodeData> {
    return {
      id: this.id,
      itemType: "AINode",
      transformation: this.transformation.serialize(),
      text: this.text.serialize(),
      linkTo: this.linkTo.serialize(),
      parentNodeId: this.parentNodeId,
      isUserRequest: this.isUserRequest,
      contextItems: this.contextItems,
      threadDirection: this.threadDirection,
    };
  }

  deserialize(data: SerializedItemData<AINodeData> | AINodeData): this {
    if (data.text) {
      this.text.deserialize(data.text);
    }
    if (data.transformation) {
      this.prevMbr = this.path?.getMbr();
      this.transformation.deserialize(data.transformation);
      this.text.updateElement();
      this.transformPath();
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

  protected onParentChanged(newParent: string): void {
    if (this.text) {
      this.text.parent = newParent;
    }
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
      case "Transformation": {
        this.prevMbr = this.path?.getMbr();
        super.apply(op);
        const transformOp = op as TransformationOperation;
        if (transformOp.method === "applyMatrix") {
          const itemOp = transformOp.items.find((i) => i.id === this.getId());
          if (
            itemOp &&
            (itemOp.matrix.scaleX !== 1 || itemOp.matrix.scaleY !== 1)
          ) {
            this.text.handleInshapeScale();
          } else if (itemOp) {
            this.text.transformCanvas();
          } else {
            this.text.updateElement();
          }
        } else {
          this.text.updateElement();
        }
        this.transformPath();
        break;
      }
      case "LinkTo":
        this.linkTo.apply(op as any);
        break;
      default:
        super.apply(op);
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

  getPrevMbr(): Mbr | null {
    return this.prevMbr;
  }

  getPointOnEdge(point: Point, edge?: string): Point {
    const itemMbr = this.getMbr();
    const { x: centerX, y: centerY } = itemMbr.getCenter();
    switch (edge) {
      case "left":
        return new Point(itemMbr.left, centerY);
      case "right":
        return new Point(itemMbr.right, centerY);
      case "top":
        return new Point(centerX, itemMbr.top);
      case "bottom":
        return new Point(centerX, itemMbr.bottom);
      default:
        return this.getMbr().getClosestEdgeCenterPoint(point);
    }
  }

  handleTransform(params: TransformParams): TransformResult {
    const { board, mbr, resizeType, oppositePoint, isHeight, isWidth, isShiftPressed, followingComments } = params;
    const res = transformAINode({
      board,
      mbr,
      resizeType,
      oppositePoint,
      isHeight,
      isWidth,
      isShiftPressed,
      followingComments,
      single: this as any,
    });
    return {
      resizedMbr: res,
    };
  }

  isBusy(): boolean {
    return !!this.board.aiGeneratingOnItem;
  }

  canBeInteractedWithWhileLocked(isAiGenerating: boolean): boolean {
    return isAiGenerating;
  }
}

export const DefaultAINodeData: AINodeData = {
  itemType: "AINode",
  transformation: new DefaultTransformationData(),
  text: new DefaultRichTextData([], "center"),
  isUserRequest: false,
  contextItems: [],
  threadDirection: 3,
};

registerItem({
  item: AINode,
  defaultData: DefaultAINodeData,
});
