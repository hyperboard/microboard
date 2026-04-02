import { Subject } from "Subject";
import { DrawingContext } from "../DrawingContext";
import { TransformationData } from "../Transformation/TransformationData";
import { GroupOperation } from "./GroupOperation";
import { GroupCommand } from "./GroupCommand";
import type { Events, Operation } from "Events";
import { Mbr } from "../Mbr/Mbr";
import { Line } from "../Line/Line";
import { Point } from "../Point/Point";
import { Transformation } from "../Transformation/Transformation";
import { registerItem } from "Items/RegisterItem";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import type { Item } from "../Item";
import { Board } from "Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import { SimpleSpatialIndex } from "../../SpatialIndex/SimpleSpatialIndex";

export interface GroupData {
  readonly itemType: "Group";
  childIds: string[];
  transformation: TransformationData;
  isLockedGroup?: boolean;
  [key: string]: unknown;
}

export class Group extends BaseItem<Group> {
  readonly itemType = "Group";
  parent = "Board";
  readonly subject = new Subject<Group>();
  transformationRenderBlock?: boolean = undefined;
  isLockedGroup = false;

  /**
   * Set to this group's id while publishing children during a group transformation.
   * Connector observers check this to skip smartJump (position is already correct
   * via recalculatePoint) and avoid persisting spurious setStartPoint/setEndPoint ops.
   */
  static movingGroupId: string | null = null;

  constructor(
    board: Board,
    id = ""
  ) {
    super(board, id);
    this.index = new SimpleSpatialIndex(this.board.camera, this.board.pointer);
    this.canBeNested = true;
  }

  isClosed(): boolean {
    return false;
  }

  getRichText(): null {
    return null;
  }

  apply(op: Operation): void {
    switch (op.class) {
      case "Transformation":
        super.apply(op);
        this.updateMbr();
        // Notify connectors subscribed to children so they follow group movement.
        // Set movingGroupId so observers skip smartJump (avoid spurious ops on reload).
        Group.movingGroupId = this.id;
        for (const child of this.index!.listAll()) {
          (child as BaseItem).subject.publish(child as any);
        }
        Group.movingGroupId = null;
        break;
      case "Group":
        if (op.method === "addChild") {
          this.applyAddChildren([op.childId]);
        } else if (op.method === "removeChild") {
          this.applyRemoveChildren([op.childId]);
        } else {
          super.apply(op);
        }
        break;
      default:
        super.apply(op);
        return;
    }
    this.subject.publish(this);
  }

  emit(operation: GroupOperation): void {
    if (this.board.events) {
      const command = new GroupCommand([this], operation);
      command.apply();
      this.board.events.emit(operation, command);
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
    const children = this.index!.listAll();
    if (children.length === 0) {
      return this.mbr.copy();
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
        new Point(childLocalMbr.left, childLocalMbr.top),
        new Point(childLocalMbr.right, childLocalMbr.top),
        new Point(childLocalMbr.right, childLocalMbr.bottom),
        new Point(childLocalMbr.left, childLocalMbr.bottom),
      ];
      for (const corner of corners) {
        groupWorldMatrix.apply(corner);
        if (corner.x < left) left = corner.x;
        if (corner.y < top) top = corner.y;
        if (corner.x > right) right = corner.x;
        if (corner.y > bottom) bottom = corner.y;
      }
    }

    const mbr = new Mbr(left, top, right, bottom);
    this.mbr.left = left;
    this.mbr.top = top;
    this.mbr.right = right;
    this.mbr.bottom = bottom;
    return mbr;
  }

  updateMbr(): void {
    this.getMbr();
  }

  getChildrenIds(): string[] {
    return this.index!.listAll().map(item => item.getId());
  }

  getChildren(): Item[] {
    return this.index!.listAll() as Item[];
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


  deserialize(data: SerializedItemData<GroupData> | GroupData): this {
    if (data.transformation) {
      this.transformation.deserialize(data.transformation);
    }
    if (data.childIds && data.childIds.length > 0) {
      this.applyAddChildren(data.childIds);
    }
    if (data.isLockedGroup !== undefined) {
      this.isLockedGroup = data.isLockedGroup;
    }
    this.updateMbr();
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
    for (const child of this.index!.listAll()) {
      child.render(context);
    }
    ctx.restore();
  }

}

export const DefaultGroupData: GroupData = {
  itemType: "Group",
  childIds: [],
  transformation: new DefaultTransformationData(),
  isLockedGroup: false,
};

registerItem({
  item: Group,
  defaultData: DefaultGroupData,
});
