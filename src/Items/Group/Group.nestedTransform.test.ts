import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { createEvents } from "Events/Events";
import { Frame } from "Items/Frame/Frame";
import { Sticker } from "Items/Sticker/Sticker";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Group } from "Items/Group/Group";
import { transformOps } from "Items/Transformation/transformOps";

function makeBoard(): Board {
  const board = new Board("test-board");
  board.events = createEvents(board, undefined, 0);
  return board;
}

function addFrame(board: Board, tx: number, ty: number): Frame {
  const proto = new Frame(board, board.items.getById.bind(board.items));
  proto.apply(transformOps.setLocal(proto.id, { translateX: tx, translateY: ty, scaleX: 1, scaleY: 1 }));
  return board.add(proto) as unknown as Frame;
}

function addSticker(board: Board, tx: number, ty: number): Sticker {
  const proto = new Sticker(board);
  proto.apply(transformOps.setLocal(proto.id, { translateX: tx, translateY: ty, scaleX: 1, scaleY: 1 }));
  return board.add(proto) as unknown as Sticker;
}

// ---------------------------------------------------------------------------
// Bug: grouping items that are inside a Frame displaced them
// ---------------------------------------------------------------------------
describe("Group: grouping preserves world positions", () => {
  let board: Board;
  beforeEach(() => { board = makeBoard(); });

  test("grouping two board-level stickers preserves their world positions", () => {
    const s1 = addSticker(board, 100, 100);
    const s2 = addSticker(board, 300, 200);

    const group = board.group([s1 as unknown as BaseItem, s2 as unknown as BaseItem]);

    expect((s1 as unknown as BaseItem).parent).toBe(group.getId());
    expect((s2 as unknown as BaseItem).parent).toBe(group.getId());

    // World matrix = group.nestingMatrix * local = identity * local = local
    const s1World = (s1 as unknown as BaseItem).getWorldMatrix();
    expect(s1World.translateX).toBeCloseTo(100, 0);
    expect(s1World.translateY).toBeCloseTo(100, 0);

    const s2World = (s2 as unknown as BaseItem).getWorldMatrix();
    expect(s2World.translateX).toBeCloseTo(300, 0);
    expect(s2World.translateY).toBeCloseTo(200, 0);
  });

  test("grouping a sticker inside a frame: world position preserved", () => {
    // frame at (500, 300), sticker at world (650, 400) → local (150, 100)
    const frame = addFrame(board, 500, 300);
    const s1 = addSticker(board, 650, 400);
    const s2 = addSticker(board, 200, 200);

    frame.applyAddChildren([s1.getId()]);
    // s1 is now inside frame, local (150, 100)
    expect((s1 as unknown as BaseItem).transformation.getTranslation().x).toBeCloseTo(150, 0);

    // Now group s1 (inside frame) with s2 (on board)
    const group = board.group([s1 as unknown as BaseItem, s2 as unknown as BaseItem]);

    expect((s1 as unknown as BaseItem).parent).toBe(group.getId());
    expect((s2 as unknown as BaseItem).parent).toBe(group.getId());

    // s1 should still be at world (650, 400)
    const s1World = (s1 as unknown as BaseItem).getWorldMatrix();
    expect(s1World.translateX).toBeCloseTo(650, 0);
    expect(s1World.translateY).toBeCloseTo(400, 0);

    // s2 should still be at world (200, 200)
    const s2World = (s2 as unknown as BaseItem).getWorldMatrix();
    expect(s2World.translateX).toBeCloseTo(200, 0);
    expect(s2World.translateY).toBeCloseTo(200, 0);
  });
});
