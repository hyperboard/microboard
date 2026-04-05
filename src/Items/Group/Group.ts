import { Subject } from "Subject";
import { DrawingContext } from "Geometry/DrawingContext";
import { TransformationData } from "Geometry/Transformation/TransformationData";
import { GroupOperation } from "./GroupOperation";
import { GroupCommand } from "./GroupCommand";
import type { Events, Operation, BaseOperation } from "Events";
import { Mbr } from "Geometry/Mbr/Mbr";
import { Line } from "Geometry/Line/Line";
import { Point } from "Geometry/Point/Point";
import { Transformation } from "Geometry/Transformation/Transformation";
import { registerItem } from "Items/RegisterItem";
import { GroupDataSchema } from "./Group.schema";
import { DefaultTransformationData } from "Geometry/Transformation/TransformationData";
import type { Item } from "../Item";
import { Board } from "Board";
import { LinkTo } from "../LinkTo/LinkTo";
import { BaseItem, SerializedItemData } from "Items/BaseItem/BaseItem";
import { BaseItemOperation } from "Items/BaseItem/BaseItemOperation";
import { UpdateHint } from "Items/BaseItem/UpdateHint";
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
    this.updateVisuals({ method: "constructor", class: this.itemType } as any, UpdateHint.FullRebuild);
  }

  isClosed(): boolean {
    return false;
  }

  getRichText(): null {
    return null;
  }

  override apply(opIn: Operation | BaseItemOperation | BaseOperation): void {
    const op = opIn as Operation;
    if (op.class === "Group") {
      if (op.method === "addChild") {
        this.applyAddChildren([op.childId]);
      } else if (op.method === "removeChild") {
        this.applyRemoveChildren([op.childId]);
      } else {
        super.apply(op);
        return;
      }
    } else if (op.class === "LinkTo") {
      this.linkTo.apply(op as any);
    } else {
      super.apply(op);
      return;
    }

    const hint = this.calculateUpdateHint(op);
    this.updateVisuals(op, hint);
  }

  protected override updateVisuals(op: Operation, hint: UpdateHint): void {
    if (hint === UpdateHint.VisualOnly) {
      this.subject.publish(this);
      return;
    }

    this.updateMbr();

    // Notify connectors subscribed to children so they follow group movement.
    if (op.class === "Transformation") {
      Group.movingGroupId = this.id;
      for (const child of this.index!.listAll()) {
        (child as BaseItem).subject.publish(child as any);
      }
      Group.movingGroupId = null;
    }

    this.subject.publish(this);
  }

  protected override getPropertyUpdateHint(property: string): UpdateHint {
    if (property === "isLockedGroup") {
      return UpdateHint.VisualOnly;
    }
    if (property === "childIds") {
      return UpdateHint.LayoutAffecting;
    }
    return super.getPropertyUpdateHint(property);
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
    const children = this.index!.listAll();
    if (children.length === 0) {
      return this.mbr.copy();
    }
    // Correctly union the children's world bounds and project them back into the
    // group's parent-space. This makes group.mbr consistent with the parent-local contract.
    const worldUnion = Mbr.unionOf(children.map(c => (c as BaseItem).getWorldMbr()));
    const parentMatrix = this.getParentWorldMatrix();
    const parentSpaceMbr = worldUnion.getTransformed(parentMatrix.getInverse());

    this.mbr.left = parentSpaceMbr.left;
    this.mbr.top = parentSpaceMbr.top;
    this.mbr.right = parentSpaceMbr.right;
    this.mbr.bottom = parentSpaceMbr.bottom;
    return parentSpaceMbr;
  }

  updateMbr(): void {
    this.getMbr();
    this.subject.publish(this as any);
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
    if (data.isLockedGroup !== undefined) {
      this.isLockedGroup = data.isLockedGroup;
    }
    this.updateVisuals({ method: "deserialize", class: this.itemType } as any, UpdateHint.FullRebuild);
    return this;
  }

  getId(): string {
    return this.id;
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
  schema: GroupDataSchema,
});
