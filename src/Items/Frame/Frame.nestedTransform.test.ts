import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { createEvents } from "Events/Events";
import { Frame } from "Items/Frame/Frame";
import { Sticker } from "Items/Sticker/Sticker";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { transformOps } from "Items/Transformation/transformOps";

/**
 * Creates a Board with events enabled (local mode, no network connection).
 */
function makeBoard(): Board {
  const board = new Board("test-board");
  board.events = createEvents(board, undefined, 0);
  return board;
}

/**
 * Adds a Frame to the board at position (0,0) with the given uniform scale.
 */
function addFrame(board: Board, scale: number): Frame {
  const proto = new Frame(board, board.items.getById.bind(board.items));
  proto.apply(transformOps.setLocal(proto.id, { translateX: 0, translateY: 0, scaleX: scale, scaleY: scale }));
  return board.add(proto) as unknown as Frame;
}

/**
 * Adds a Sticker to the board at the given world position (scale=1).
 */
function addSticker(board: Board, worldX: number, worldY: number): Sticker {
  const proto = new Sticker(board);
  proto.apply(transformOps.setLocal(proto.id, { translateX: worldX, translateY: worldY, scaleX: 1, scaleY: 1 }));
  return board.add(proto) as unknown as Sticker;
}

// ---------------------------------------------------------------------------
// Bug: drag distance too large for items nested in a Frame
// ---------------------------------------------------------------------------
describe("Frame: nested item drag uses local-space conversion", () => {
  let board: Board;
  beforeEach(() => { board = makeBoard(); });

  test("world-space translateX=100 in a 2× frame moves sticker by local 100", () => {
    const frame = addFrame(board, 2);
    const sticker = addSticker(board, 100, 50);

    // Nest sticker inside frame. After this call sticker.parent === frame.getId()
    // and sticker.transformation stores local coords relative to the frame.
    frame.applyAddChildren([sticker.getId()]);

    // Frame scale is ignored for nesting ⟹ local (100, 50)
    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(100, 0);
    expect(localBefore.y).toBeCloseTo(50, 0);

    // Emit a world-space applyMatrix op (as the drag system does)
    board.events.applyAndEmit({
      class: "Transformation",
      method: "applyMatrix",
      items: [{
        id: sticker.getId(),
        matrix: { translateX: 100, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
      }],
    });

    // Local delta should be 100 (ignores frame scale)  →  localX: 100 + 100 = 200
    const localAfter = sticker.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(200, 0);
    expect(localAfter.y).toBeCloseTo(50, 0); // Y unchanged
  });

  test("world-space translateX=100 in a 4× frame moves sticker by local 100", () => {
    const frame = addFrame(board, 4);
    const sticker = addSticker(board, 400, 200);

    frame.applyAddChildren([sticker.getId()]);

    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(400, 0);
    expect(localBefore.y).toBeCloseTo(200, 0);

    board.events.applyAndEmit({
      class: "Transformation",
      method: "applyMatrix",
      items: [{
        id: sticker.getId(),
        matrix: { translateX: 100, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
      }],
    });

    // local delta = 100  →  localX: 400 + 100 = 500
    const localAfter = sticker.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(500, 0);
    expect(localAfter.y).toBeCloseTo(200, 0);
  });

  test("board-level sticker (no frame) applies world delta directly", () => {
    const sticker = addSticker(board, 100, 50);

    board.events.applyAndEmit({
      class: "Transformation",
      method: "applyMatrix",
      items: [{
        id: sticker.getId(),
        matrix: { translateX: 100, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
      }],
    });

    // world === local for top-level items  →  100 + 100 = 200
    const posAfter = sticker.transformation.getTranslation();
    expect(posAfter.x).toBeCloseTo(200, 0);
    expect(posAfter.y).toBeCloseTo(50, 0);
  });
});

// ---------------------------------------------------------------------------
// getWorldMbr: nested item world bounds should ignore frame scale
// ---------------------------------------------------------------------------
describe("BaseItem.getWorldMbr: nested item world bounds", () => {
  let board: Board;
  beforeEach(() => { board = makeBoard(); });

  test("sticker nested in 2× frame has world mbr same as local mbr (ignores frame scale)", () => {
    const frame = addFrame(board, 2);
    const sticker = addSticker(board, 100, 50);
    frame.applyAddChildren([sticker.getId()]);

    const localMbr = sticker.getMbr();
    const worldMbr = (sticker as unknown as BaseItem).getWorldMbr();

    // World MBR should be localMbr (ignores frame scale)
    expect(worldMbr.left).toBeCloseTo(localMbr.left, 0);
    expect(worldMbr.top).toBeCloseTo(localMbr.top, 0);
    expect(worldMbr.right).toBeCloseTo(localMbr.right, 0);
    expect(worldMbr.bottom).toBeCloseTo(localMbr.bottom, 0);
  });

  test("board-level sticker getWorldMbr() === getMbr()", () => {
    const sticker = addSticker(board, 100, 50);
    const localMbr = sticker.getMbr();
    const worldMbr = (sticker as unknown as BaseItem).getWorldMbr();
    expect(worldMbr.left).toBeCloseTo(localMbr.left, 0);
    expect(worldMbr.top).toBeCloseTo(localMbr.top, 0);
    expect(worldMbr.right).toBeCloseTo(localMbr.right, 0);
    expect(worldMbr.bottom).toBeCloseTo(localMbr.bottom, 0);
  });
});

// ---------------------------------------------------------------------------
// Snapshot round-trip: nested items should stay in place after snapshot load
// ---------------------------------------------------------------------------
describe("Frame: snapshot round-trip preserves nested item positions", () => {
  let board: Board;

  // Simulate server: apply events directly without going through the log's
  // revert/apply cycle. Use board.serialize() like getSnapshotFromList does
  // when all events are confirmed (no unconfirmed ops on the server).
  function makeServerSnapshot(b: Board) {
    return { items: b.serialize(), events: [], lastIndex: 0 };
  }

  beforeEach(() => { board = makeBoard(); });

  test("sticker stays at correct local coords after snapshot serialize/deserialize", () => {
    // frame at (500, 300), sticker at world (650, 400)
    const frame = addFrame(board, 1);
    frame.apply(transformOps.setLocal(frame.id, { translateX: 500, translateY: 300, scaleX: 1, scaleY: 1 }));
    const sticker = addSticker(board, 650, 400);

    frame.applyAddChildren([sticker.getId()]);

    // local = world - frameTranslation = (150, 100)
    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(150, 0);
    expect(localBefore.y).toBeCloseTo(100, 0);

    // snapshot should have WORLD coords for nested sticker
    const snapshot = makeServerSnapshot(board);
    const stickerData = snapshot.items.find((d: any) => d.id === sticker.getId());
    expect(stickerData).toBeTruthy();
    expect(stickerData.transformation.translateX).toBeCloseTo(650, 0);
    expect(stickerData.transformation.translateY).toBeCloseTo(400, 0);

    // load into fresh board
    const board2 = makeBoard();
    board2.deserialize(snapshot);

    const sticker2 = board2.items.getById(sticker.getId()) as unknown as BaseItem;
    expect(sticker2).toBeTruthy();
    expect(sticker2.parent).toBe(frame.getId());

    const localAfter = sticker2.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(150, 0);
    expect(localAfter.y).toBeCloseTo(100, 0);
  });

  test("sticker stays correct for scaled frame after round-trip", () => {
    const frame = addFrame(board, 2);
    frame.apply(transformOps.setLocal(frame.id, { translateX: 1000, translateY: 500, scaleX: 2, scaleY: 2 }));
    const sticker = addSticker(board, 1200, 700);

    frame.applyAddChildren([sticker.getId()]);

    // Frame ignores scale for nesting: localX = 1200 - 1000 = 200, localY = 700 - 500 = 200
    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(200, 0);
    expect(localBefore.y).toBeCloseTo(200, 0);

    const snapshot = makeServerSnapshot(board);
    const board2 = makeBoard();
    board2.deserialize(snapshot);

    const sticker2 = board2.items.getById(sticker.getId()) as unknown as BaseItem;
    expect(sticker2).toBeTruthy();
    expect(sticker2.parent).toBe(frame.getId());

    const localAfter = sticker2.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(200, 0);
    expect(localAfter.y).toBeCloseTo(200, 0);
  });
});
