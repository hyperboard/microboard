import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { createEvents } from "Events/Events";
import { Frame } from "Items/Frame/Frame";
import { Sticker } from "Items/Sticker/Sticker";
import { BaseItem } from "Items/BaseItem/BaseItem";

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
  proto.transformation.setLocal({ translateX: 0, translateY: 0, scaleX: scale, scaleY: scale });
  return board.add(proto) as unknown as Frame;
}

/**
 * Adds a Sticker to the board at the given world position (scale=1).
 */
function addSticker(board: Board, worldX: number, worldY: number): Sticker {
  const proto = new Sticker(board);
  proto.transformation.setLocal({ translateX: worldX, translateY: worldY, scaleX: 1, scaleY: 1 });
  return board.add(proto) as unknown as Sticker;
}

// ---------------------------------------------------------------------------
// Bug: drag distance too large for items nested in a Frame
// ---------------------------------------------------------------------------
describe("Frame: nested item drag uses local-space conversion", () => {
  let board: Board;
  beforeEach(() => { board = makeBoard(); });

  test("world-space translateX=100 in a 2× frame moves sticker by local 50", () => {
    const frame = addFrame(board, 2);
    const sticker = addSticker(board, 100, 50);

    // Nest sticker inside frame. After this call sticker.parent === frame.getId()
    // and sticker.transformation stores local coords relative to the frame.
    frame.applyAddChildren([sticker.getId()]);

    // World (100,50) in a frame at scale 2 ⟹ local (50, 25)
    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(50, 0);
    expect(localBefore.y).toBeCloseTo(25, 0);

    // Emit a world-space applyMatrix op (as the drag system does)
    board.events.applyAndEmit({
      class: "Transformation",
      method: "applyMatrix",
      items: [{
        id: sticker.getId(),
        matrix: { translateX: 100, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
      }],
    });

    // Local delta should be 100 / frameScale(2) = 50  →  localX: 50 + 50 = 100
    const localAfter = sticker.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(100, 0);
    expect(localAfter.y).toBeCloseTo(25, 0); // Y unchanged
  });

  test("world-space translateX=100 in a 4× frame moves sticker by local 25", () => {
    const frame = addFrame(board, 4);
    const sticker = addSticker(board, 400, 200);

    frame.applyAddChildren([sticker.getId()]);

    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(100, 0); // 400/4
    expect(localBefore.y).toBeCloseTo(50, 0);  // 200/4

    board.events.applyAndEmit({
      class: "Transformation",
      method: "applyMatrix",
      items: [{
        id: sticker.getId(),
        matrix: { translateX: 100, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
      }],
    });

    // local delta = 100 / 4 = 25  →  localX: 100 + 25 = 125
    const localAfter = sticker.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(125, 0);
    expect(localAfter.y).toBeCloseTo(50, 0);
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
// getWorldMbr: nested item world bounds should reflect frame scale
// ---------------------------------------------------------------------------
describe("BaseItem.getWorldMbr: nested item world bounds", () => {
  let board: Board;
  beforeEach(() => { board = makeBoard(); });

  test("sticker nested in 2× frame has world mbr twice as large as local mbr", () => {
    const frame = addFrame(board, 2);
    const sticker = addSticker(board, 100, 50);
    frame.applyAddChildren([sticker.getId()]);

    const localMbr = sticker.getMbr();
    const worldMbr = (sticker as unknown as BaseItem).getWorldMbr();

    // World MBR should be localMbr corners scaled by 2 (frame scale)
    expect(worldMbr.left).toBeCloseTo(localMbr.left * 2, 0);
    expect(worldMbr.top).toBeCloseTo(localMbr.top * 2, 0);
    expect(worldMbr.right).toBeCloseTo(localMbr.right * 2, 0);
    expect(worldMbr.bottom).toBeCloseTo(localMbr.bottom * 2, 0);
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
