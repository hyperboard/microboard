import { beforeEach, describe, expect, it } from "bun:test";
import { Board } from "../../../Board";
import { BaseItem } from "../../BaseItem/BaseItem";
import { Group } from "../Group";

function createItem(
  board: Board,
  id: string,
  left: number,
  top: number,
  right: number,
  bottom: number
): BaseItem {
  const item = new BaseItem(board, id);
  item.left = left;
  item.top = top;
  item.right = right;
  item.bottom = bottom;
  board.index.insert(item);
  return item;
}

describe("group regressions", () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it("returns grouped children from hit-testing so they can be dragged individually", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);

    board.group([child, sibling]);
    board.pointer.pointTo(20, 20);

    const underPointer = board.items.getUnderPointer();

    expect(underPointer).toHaveLength(1);
    expect(underPointer[0]?.getId()).toBe(child.getId());
  });

  it("promotes a grouped child click into selecting its parent group", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);

    board.pointer.pointTo(20, 20);
    board.selection.editUnderPointer();

    expect(board.selection.items.getSingle()).toBe(group);
  });

  it("ungroups into plain board items instead of leaving nested group state behind", () => {
    const item1 = createItem(board, "item1", 10, 10, 30, 30);
    const item2 = createItem(board, "item2", 40, 10, 60, 30);
    const item3 = createItem(board, "item3", 70, 10, 90, 30);
    const group = board.group([item1, item2, item3]);

    board.ungroup(group);

    expect(board.items.getById(group.getId())).toBeUndefined();
    expect(item1.parent).toBe("Board");
    expect(item2.parent).toBe("Board");
    expect(item3.parent).toBe("Board");
    expect(board.items.getById(item1.getId())).toBe(item1);
    expect(board.items.getById(item2.getId())).toBe(item2);
    expect(board.items.getById(item3.getId())).toBe(item3);
  });

  it("allows groups to be nested inside other groups through normal nesting flow", () => {
    const outerChild = createItem(board, "outer-child", 0, 0, 120, 120);
    const nestedChild = createItem(board, "nested-child", 10, 10, 30, 30);
    const outerGroup = board.group([outerChild]);
    const nestedGroup = board.group([nestedChild]);

    board.handleNesting(nestedGroup);

    expect(nestedGroup.parent).toBe(outerGroup.getId());
    expect(outerGroup.getChildrenIds()).toContain(nestedGroup.getId());
  });
});
