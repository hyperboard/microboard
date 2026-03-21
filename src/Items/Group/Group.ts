import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { TransformationData } from "../Transformation/TransformationData";
import { GroupOperation } from "./GroupOperation";
import { GroupCommand } from "./GroupCommand";
import { Events, Operation } from "Events";
import { Mbr, Line, Point, Transformation, Item } from "..";
import { Board } from "Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import { DocumentFactory } from "api/DocumentFactory";

export interface GroupData {
  readonly itemType: "Group";
  childIds: string[];
  transformation: TransformationData;
  isLockedGroup?: boolean;
  [key: string]: any;
}

export class Group extends BaseItem {
  readonly linkTo: LinkTo;
  readonly itemType = "Group";
  parent = "Board";
  readonly transformation: Transformation;
  readonly subject = new Subject<Group>();
  transformationRenderBlock?: boolean = undefined;
  isLockedGroup = false;

  constructor(
    board: Board,
    private events?: Events,
    childIds: string[] = [],
    id = ""
  ) {
    // isGroupItem=true creates this.index (SimpleSpatialIndex) for child storage.
    super(board, id, undefined, true);
    this.canBeNested = true;
    this.linkTo = new LinkTo(this.id, this.events);
    this.transformation = new Transformation(this.id, this.events);

    this.transformation.subject.subscribe(() => {
      this.updateMbr();
      this.subject.publish(this);
    });

    // Restore children passed via constructor (used when creating Group from existing data)
    if (childIds.length > 0) {
      this.applyAddChildren(childIds);
    }
  }

  isClosed(): boolean {
    return false;
  }

  getRichText(): null {
    return null;
  }

  apply(op: Operation): void {
    super.apply(op);
    switch (op.class) {
      case "Group":
        if (op.method === "addChild") {
          this.applyAddChildren([op.childId]);
        } else if (op.method === "removeChild") {
          this.applyRemoveChildren([op.childId]);
        }
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

  getMbr(): Mbr {
    // World Mbr = union of each child's local Mbr transformed by group's world matrix
    const children = this.index!.list();
    if (children.length === 0) {
      return new Mbr(this.left, this.top, this.right, this.bottom);
    }
    const groupWorldMatrix = this.getWorldMatrix();
    let left = Number.MAX_SAFE_INTEGER;
    let top = Number.MAX_SAFE_INTEGER;
    let right = Number.MIN_SAFE_INTEGER;
    let bottom = Number.MIN_SAFE_INTEGER;

    for (const child of children) {
      const childLocalMbr = (child as BaseItem).getMbr();
      // Transform the four corners of the child's local Mbr through the group's world matrix
      const corners = [
        new Point(childLocalMbr.left,  childLocalMbr.top),
        new Point(childLocalMbr.right, childLocalMbr.top),
        new Point(childLocalMbr.right, childLocalMbr.bottom),
        new Point(childLocalMbr.left,  childLocalMbr.bottom),
      ];
      for (const corner of corners) {
        groupWorldMatrix.apply(corner);
        if (corner.x < left)   left   = corner.x;
        if (corner.y < top)    top    = corner.y;
        if (corner.x > right)  right  = corner.x;
        if (corner.y > bottom) bottom = corner.y;
      }
    }

    const mbr = new Mbr(left, top, right, bottom);
    this.left   = left;
    this.top    = top;
    this.right  = right;
    this.bottom = bottom;
    return mbr;
  }

  updateMbr(): void {
    this.getMbr();
  }

  getChildrenIds(): string[] {
    return this.index!.list().map(item => item.getId());
  }

  getChildren(): Item[] {
    return this.index!.list() as Item[];
  }

  getLinkTo(): string | undefined {
    return this.linkTo.link;
  }

  serialize(): SerializedItemData<GroupData> {
    return {
      id: this.id,
      itemType: "Group",
      // Children IDs only — transforms are serialized as world transforms by SpatialIndex.copy()
      childIds: this.getChildrenIds(),
      transformation: this.transformation.serialize(),
      isLockedGroup: this.isLockedGroup,
    };
  }

  deserialize(data: SerializedItemData<GroupData>): this {
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
    }
    if (data.childIds && data.childIds.length > 0) {
      this.applyAddChildren(data.childIds);
    }
    if (data.isLockedGroup !== undefined) {
      this.isLockedGroup = data.isLockedGroup;
    }
    this.subject.publish(this);
    return this;
  }

  getId(): string {
    return this.id;
  }

  getIntersectionPoints(segment: Line): Point[] {
    const lines = this.getMbr().getLines();
    const initPoints: Point[] = [];
    return lines.reduce((acc, line) => {
      const intersections = line.getIntersectionPoints(segment);
      if (intersections.length > 0) {
        acc.push(...intersections);
      }
      return acc;
    }, initPoints);
  }

  render(context: DrawingContext): void {
    if (this.transformationRenderBlock) {
      return;
    }
    // Apply group's world transform so children render using their local transforms.
    const ctx = context.ctx;
    ctx.save();
    this.transformation.applyToContext(ctx);
    for (const child of this.index!.list()) {
      child.render(context);
    }
    ctx.restore();
  }

  renderHTML(documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("div");
    div.id = this.id;
    const { translateX, translateY, scaleX, scaleY } =
      this.transformation.getMatrixData();

    div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.position = "absolute";
    div.style.transformOrigin = "0 0";

    return div;
  }
}
