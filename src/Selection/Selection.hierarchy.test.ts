import { beforeEach, describe, expect, test } from "bun:test";
import { initNodeSettings } from "api/initNodeSettings";
import { Board } from "Board";
import { createEvents } from "Events/Events";
import { Frame } from "Items/Frame/Frame";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { transformOps } from "Items/Transformation/transformOps";
import type { SelectionHierarchyNode } from "Selection";

initNodeSettings();

function makeBoard(): Board {
  const board = new Board("selection-hierarchy");
  board.events = createEvents(board, undefined, 0);
  return board;
}

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
  item.apply(transformOps.setLocal(item.id, {
    translateX: left,
    translateY: top,
    scaleX: 1,
    scaleY: 1,
  }));
  board.index.insert(item);
  return item;
}

function createFrame(
  board: Board,
  translateX = 0,
  translateY = 0,
  scaleX = 1,
  scaleY = 1
): Frame {
  const frame = new Frame(board, board.items.getById.bind(board.items));
  frame.apply(transformOps.setLocal(frame.id, { translateX, translateY, scaleX, scaleY }));
  return board.add(frame) as Frame;
}

describe("hierarchical selection rules", () => {
  let board: Board;

  beforeEach(() => {
    board = makeBoard();
  });

  test("clicking an item on board selects that item", () => {
    const item = createItem(board, "item", 10, 10, 30, 30);

    board.pointer.pointTo(20, 20);
    board.selection.selectUnderPointer();

    expect(board.selection.items.getSingle()).toBe(item);
  });

  test("clicking an item inside a group selects the item, not the group", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, board.items.getById("sibling") as BaseItem]);

    board.pointer.pointTo(20, 20);
    board.selection.selectUnderPointer();

    expect(board.selection.items.getSingle()).toBe(child);
    expect(board.selection.items.getSingle()).not.toBe(group);
  });

  test("clicking a frame selects the frame", () => {
    const frame = createFrame(board, 25, 30, 2, 2);
    const center = frame.getMbr().getCenter();

    board.pointer.pointTo(center.x, center.y);
    board.selection.selectUnderPointer();

    expect(board.selection.items.getSingle()).toBe(frame);
  });

  test("adding descendant when ancestor already selected does nothing", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);

    board.selection.add(group);
    board.selection.add(child);

    expect(board.selection.list()).toEqual([group]);
  });

  test("adding ancestor when descendants are selected replaces descendants with ancestor", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);

    board.selection.add(child);
    board.selection.add(sibling);
    board.selection.add(group);

    expect(board.selection.list()).toEqual([group]);
  });

  test("adding unrelated node keeps both", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const outside = createItem(board, "outside", 120, 10, 140, 30);
    const group = board.group([child, sibling]);

    board.selection.add(group);
    board.selection.add(outside);

    expect(board.selection.list()).toEqual([group, outside]);
  });

  test("selecting frame plus external item is valid", () => {
    const frame = createFrame(board, 0, 0, 2, 2);
    const outside = createItem(board, "outside", 300, 20, 320, 40);

    board.selection.add(frame);
    board.selection.add(outside);

    expect(board.selection.list()).toEqual([frame, outside]);
  });

  test("selecting group plus descendant item is impossible", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);

    board.selection.add([group, child]);

    expect(board.selection.list()).toEqual([group]);
  });

  test("selecting frame plus descendant item is impossible", () => {
    const frame = createFrame(board, 0, 0, 2, 2);
    const child = createItem(board, "child", 50, 50, 70, 70);
    frame.applyAddChildren([child.getId()]);

    board.selection.add([frame, child]);

    expect(board.selection.list()).toEqual([frame]);
  });

  test("dragging selected item moves item only", () => {
    const item = createItem(board, "item", 10, 10, 30, 30);

    board.selection.add(item);
    board.selection.transformMany(board.selection.getManyItemsTranslation(15, 5), Date.now());

    const moved = item.transformation.getTranslation();
    expect(moved.x).toBe(25);
    expect(moved.y).toBe(15);
  });

  test("dragging selected group moves full subtree once", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);
    const childBefore = child.getWorldMatrix();

    board.selection.add(group);
    board.selection.transformMany(board.selection.getManyItemsTranslation(15, 0), Date.now());

    expect(group.transformation.getTranslation().x).toBe(15);
    expect(child.getWorldMatrix().translateX).toBe(childBefore.translateX + 15);
  });

  test("dragging selected frame moves full subtree once", () => {
    const frame = createFrame(board, 0, 0, 2, 2);
    const child = createItem(board, "child", 50, 50, 70, 70);
    frame.applyAddChildren([child.getId()]);
    const childBefore = child.getWorldMatrix();

    board.selection.add(frame);
    board.selection.transformMany(board.selection.getManyItemsTranslation(20, 10), Date.now());

    expect(frame.transformation.getTranslation().x).toBe(20);
    expect(frame.transformation.getTranslation().y).toBe(10);
    expect(child.getWorldMatrix().translateX).toBe(childBefore.translateX + 20);
    expect(child.getWorldMatrix().translateY).toBe(childBefore.translateY + 10);
  });

  test("dragging mixed valid selection moves each selected root exactly once", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const outside = createItem(board, "outside", 120, 10, 140, 30);
    const group = board.group([child, sibling]);
    const childBefore = child.getWorldMatrix();
    const outsideBefore = outside.transformation.getTranslation();

    board.selection.add(group);
    board.selection.add(outside);
    board.selection.transformMany(board.selection.getManyItemsTranslation(25, 0), Date.now());

    expect(child.getWorldMatrix().translateX).toBe(childBefore.translateX + 25);
    expect(outside.transformation.getTranslation().x).toBe(outsideBefore.x + 25);
  });

  test("moving a child between groups does not duplicate it in the board index", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const outside = createItem(board, "outside", 120, 10, 140, 30);
    const firstGroup = board.group([child, sibling]);
    const secondGroup = board.group([outside]);

    secondGroup.applyAddChildren([child.getId()]);

    const childEntries = board.items
      .listAll()
      .filter((item) => item.getId() === child.getId());

    expect(child.parent).toBe(secondGroup.getId());
    expect(firstGroup.getChildrenIds()).toEqual([sibling.getId()]);
    expect(secondGroup.getChildrenIds()).toEqual([outside.getId(), child.getId()]);
    expect(childEntries).toHaveLength(1);
  });

  test("moving child updates computed group bounds", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 20, 60, 40);
    const group = board.group([child, sibling]);

    child.left += 100;
    child.right += 100;

    const mbr = group.getMbr();
    expect(mbr.left).toBe(40);
    expect(mbr.right).toBe(130);
  });

  test("nested groups update bounds correctly up the chain", () => {
    const innerChild = createItem(board, "inner-child", 10, 10, 30, 30);
    const innerGroup = board.group([innerChild]);
    const outerCover = createItem(board, "outer-cover", 0, 0, 120, 120);
    const outerGroup = board.group([outerCover]);

    outerGroup.applyAddChildren([innerGroup.getId()]);
    innerChild.left += 80;
    innerChild.right += 80;

    const innerBounds = innerGroup.getMbr();
    const outerBounds = outerGroup.getMbr();

    expect(innerBounds.left).toBe(90);
    expect(innerBounds.right).toBe(110);
    expect(outerBounds.left).toBe(0);
    expect(outerBounds.right).toBe(120);
  });

  test("moving frame moves descendants", () => {
    const frame = createFrame(board, 10, 20, 2, 2);
    const child = createItem(board, "child", 50, 60, 70, 80);
    frame.applyAddChildren([child.getId()]);
    const before = child.getWorldMatrix();

    frame.apply(transformOps.translateBy(frame.id, 15, 5));

    expect(child.getWorldMatrix().translateX).toBe(before.translateX + 15);
    expect(child.getWorldMatrix().translateY).toBe(before.translateY + 5);
  });

  test("resizing frame does not scale descendants", () => {
    const frame = createFrame(board, 0, 0, 1, 1);
    const child = createItem(board, "child", 50, 60, 70, 80);
    frame.applyAddChildren([child.getId()]);
    const before = child.getWorldMatrix();

    frame.apply(transformOps.scaleTo(frame, 3, 4));

    const after = child.getWorldMatrix();
    expect(after.translateX).toBe(before.translateX);
    expect(after.translateY).toBe(before.translateY);
    expect(after.scaleX).toBe(before.scaleX);
    expect(after.scaleY).toBe(before.scaleY);
  });

  test("selecting parent from child returns direct parent", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);

    board.selection.add(child);

    expect(board.selection.canPromoteSelectionToParent()).toBe(true);
    expect(board.selection.selectParent()).toBe(group);
    expect(board.selection.items.getSingle()).toBe(group);
  });

  test("selecting ancestor by id works", () => {
    const child = createItem(board, "child", 10, 10, 30, 30);
    const sibling = createItem(board, "sibling", 40, 10, 60, 30);
    const group = board.group([child, sibling]);

    board.selection.add(child);

    expect(board.selection.selectAncestorById(group.getId())).toBe(group);
    expect(board.selection.items.getSingle()).toBe(group);
  });

  test("parent chain and hierarchy metadata are returned correctly for nested hierarchies", () => {
    const frame = createFrame(board, 0, 0, 2, 2);
    const child = createItem(board, "child", 10, 10, 30, 30);
    const cousin = createItem(board, "cousin", 40, 10, 60, 30);
    const group = board.group([child, cousin]);
    frame.applyAddChildren([group.getId()]);

    board.selection.add(child);

    const chain = board.selection.getParentChain(child);
    const path = board.selection.getHierarchyPath(child);
    const ids = path.map((node: SelectionHierarchyNode) => node.id);

    expect(chain.map((item) => item.getId())).toEqual([group.getId(), frame.getId()]);
    expect(ids).toEqual([frame.getId(), group.getId(), child.getId()]);
    expect(path.map((node: SelectionHierarchyNode) => node.isCanvasSelectable)).toEqual([true, false, true]);
  });
});
