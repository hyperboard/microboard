import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { TransformationData } from "../Transformation/TransformationData";
import { GroupOperation } from "./GroupOperation";
import { GroupCommand } from "./GroupCommand";
import { Events, Operation } from "Events";
import { Mbr, Line, Point, Transformation, Item } from "..";
import { Board } from "Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { DocumentFactory } from "api/DocumentFactory";

export interface GroupData {
  readonly itemType: "Group";
  children: string[];
  transformation: TransformationData;
}

export class Group extends BaseItem {
  readonly linkTo: LinkTo;
  readonly itemType = "Group";
  parent = "Board";
  readonly transformation: Transformation;
  readonly subject = new Subject<Group>();
  private mbr: Mbr = new Mbr();
  transformationRenderBlock?: boolean = undefined;

  constructor(
    board: Board,
    private events?: Events,
    private children: string[] = [],
    id = ""
  ) {
    super(board, id);
    this.linkTo = new LinkTo(this.id, this.events);
    this.transformation = new Transformation(this.id, this.events);
    this.children = children;

    this.transformation.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });
  }

  isClosed(): boolean {
    return false;
  }

  getRichText(): null {
    return null;
  }

  addChild(childId: string): void {
    this.emit({
      class: "Group",
      method: "addChild",
      item: [this.getId()],
      childId,
    });
  }

  private applyAddChild(childId: string): void {
    if (!this.children.includes(childId)) {
      this.children.push(childId);
      this.updateMbr();
      this.subject.publish(this);
    }
  }

  private applyRemoveChild(childId: string): void {
    this.children = this.children.filter((currChild) => currChild !== childId);
    this.updateMbr();
    this.subject.publish(this);
  }

  removeChild(childId: string): void {
    this.emit({
      class: "Group",
      method: "removeChild",
      item: [this.getId()],
      childId,
    });
  }

  emitRemoveChild(child: Item): void {
    this.removeChild(child.getId());
    child.parent = "Board";
  }

  apply(op: Operation): void {
    switch (op.class) {
      case "Group":
        if (op.method === "addChild") {
          this.applyAddChild(op.childId);
        } else if (op.method === "removeChild") {
          this.applyRemoveChild(op.childId);
        }
        break;
      case "Transformation":
        this.transformation.apply(op);
        break;
      default:
        return;
    }
    this.subject.publish(this);
  }

  emit(operation: GroupOperation): void {
    if (this.events) {
      const command = new GroupCommand([this], operation);
      command.apply();
      this.events.emit(operation, command);
    } else {
      this.apply(operation);
    }
  }

  setId(id: string): this {
    this.id = id;
    this.transformation.setId(id);
    return this;
  }

  serialize(): GroupData {
    return {
      itemType: "Group",
      children: this.children,
      transformation: this.transformation.serialize(),
    };
  }

  deserialize(data: GroupData): this {
    if (data.children) {
      data.children.forEach((childId) => {
        this.applyAddChild(childId);
        const item = this.board.items.getById(childId);

        if (item) {
          item.parent = this.getId();
        }
      });
    }

    this.transformation.deserialize(data.transformation);
    this.subject.publish(this);
    return this;
  }

  getId(): string {
    return this.id;
  }

  getIntersectionPoints(segment: Line): Point[] {
    const lines = this.getMbr().getLines();
    const initPoints: Point[] = [];
    const points = lines.reduce((acc, line) => {
      const intersections = line.getIntersectionPoints(segment);
      if (intersections.length > 0) {
        acc.push(...intersections);
      }
      return acc;
    }, initPoints);
    return points;
  }

  getMbr(): Mbr {
    const mbr = new Mbr();
    let left = Number.MAX_SAFE_INTEGER;
    let top = Number.MAX_SAFE_INTEGER;
    let right = Number.MIN_SAFE_INTEGER;
    let bottom = Number.MIN_SAFE_INTEGER;

    const mbrs = this.children.flatMap((childId: string) => {
      const item = this.board.items.getById(childId);
      if (!item) {
        return [];
      }

      const mbr = item.getMbr();
      if (!mbr) {
        return [];
      }

      if (left > mbr.left) {
        left = mbr.left;
      }
      if (top > mbr.top) {
        top = mbr.top;
      }
      if (right < mbr.right) {
        right = mbr.right;
      }
      if (bottom < mbr.bottom) {
        bottom = mbr.bottom;
      }
      return [mbr];
    });

    if (mbrs.length) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      mbr.combine(mbrs);

      mbr.left = left !== Number.MAX_SAFE_INTEGER ? left : 0;
      mbr.top = top !== Number.MAX_SAFE_INTEGER ? top : 0;
      mbr.right = right !== Number.MIN_SAFE_INTEGER ? right : 0;
      mbr.bottom = bottom !== Number.MIN_SAFE_INTEGER ? bottom : 0;
      this.left = mbr.left;
      this.bottom = mbr.bottom;
      this.right = mbr.right;
      this.top = mbr.top;
    }

    return mbr;
  }

  getChildrenIds(): string[] {
    return this.children;
  }

  getChildren(): Item[] {
    return this.children
      .map((itemId) => this.board.items.getById(itemId))
      .filter((item): item is Item => item !== undefined);
  }

  updateMbr(): void {
    const rect = this.getMbr();
    this.mbr = rect;
    this.mbr.borderColor = "transparent";
  }

  setBoard(board: Board): void {
    this.board = board;
  }

  setChildren(items: string[]): void {
    items.forEach((itemId) => {
      this.addChild(itemId);

      const item = this.board.items.getById(itemId);
      if (item) {
        item.parent = this.getId();
      }
    });

    this.updateMbr();
  }

  removeChildren(): void {
    this.children.forEach((itemId) => {
      this.removeChild(itemId);

      const item = this.board.items.getById(itemId);
      if (item) {
        item.parent = this.parent;
      }
    });

    this.updateMbr();
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }

    this.mbr.render(context);
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    return documentFactory.createElement("div");
  }
}
