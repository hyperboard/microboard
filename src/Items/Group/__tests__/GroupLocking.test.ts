import { describe, it, expect, beforeEach } from "bun:test";
import { Board } from "../../../Board";
import { Group } from "../Group";
import { BaseItem } from "../../BaseItem/BaseItem";
import { transformOps } from "../../Transformation/transformOps";

describe("Group Locking Interaction", () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it("should create a manual group that is not locked by default", () => {
    const item1 = new BaseItem(board, "item1");
    const item2 = new BaseItem(board, "item2");
    board.index.insert(item1);
    board.index.insert(item2);

    const group = board.group([item1, item2]);

    expect(group.isLockedGroup).toBe(false);
    expect(group.transformation.isLocked).toBe(false);
    expect(item1.transformation.isLocked).toBe(false);
    expect(item2.transformation.isLocked).toBe(false);
  });

  it("should create an auto-locked group that is locked by default", () => {
    const item1 = new BaseItem(board, "item1");
    const item2 = new BaseItem(board, "item2");
    board.index.insert(item1);
    board.index.insert(item2);

    const group = board.addLockedGroup([item1, item2]);

    expect(group.isLockedGroup).toBe(true);
    expect(group.transformation.isLocked).toBe(true);
    expect(item1.transformation.isLocked).toBe(true);
    expect(item2.transformation.isLocked).toBe(true);
  });

  it("should NOT ungroup a manual group when it is unlocked", () => {
    const item1 = new BaseItem(board, "item1");
    const item2 = new BaseItem(board, "item2");
    
    board.index.insert(item1);
    board.index.insert(item2);

    const group = board.group([item1, item2]);
    
    // Manually lock it
    group.apply(transformOps.lock(group.getId(), true));
    expect(group.transformation.isLocked).toBe(true);

    // Now unlock it (simulating Lock.tsx behavior)
    if (group.isLockedGroup) {
       board.removeLockedGroup(group);
    } else {
       group.apply(transformOps.lock(group.getId(), false));
    }

    expect(board.items.getById(group.getId())).toBeDefined();
    expect(group.transformation.isLocked).toBe(false);
    expect(item1.parent).toBe(group.getId());
    expect(item2.parent).toBe(group.getId());
  });

  it("should dissolve an auto-locked group when it is unlocked", () => {
    const item1 = new BaseItem(board, "item1");
    const item2 = new BaseItem(board, "item2");
    board.index.insert(item1);
    board.index.insert(item2);

    const group = board.addLockedGroup([item1, item2]);
    expect(group.isLockedGroup).toBe(true);

    // Unlock it (simulating Lock.tsx behavior)
    if (group.isLockedGroup) {
       board.removeLockedGroup(group);
    } else {
       group.apply(transformOps.lock(group.getId(), false));
    }

    expect(board.items.getById(group.getId())).toBeUndefined();
    expect(item1.parent).toBe("Board");
    expect(item2.parent).toBe("Board");
    expect(item1.transformation.isLocked).toBe(false);
    expect(item2.transformation.isLocked).toBe(false);
  });
});
