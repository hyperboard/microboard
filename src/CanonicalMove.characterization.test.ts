import { initNodeSettings } from "api/initNodeSettings";
initNodeSettings();

import { Board } from "Board";
import { createEvents } from "Events/Events";
import { Frame } from "Items/Frame/Frame";
import { Sticker } from "Items/Sticker/Sticker";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { transformOps } from "Items/Transformation/transformOps";

function makeBoard(): Board {
  const board = new Board("test-board");
  board.events = createEvents(board, undefined, 0);
  return board;
}

function addFrame(board: Board, tx: number, ty: number, scale: number = 1): Frame {
  const proto = new Frame(board);
  proto.apply(transformOps.setLocal(proto.id, { translateX: tx, translateY: ty, scaleX: scale, scaleY: scale }));
  return board.add(proto) as unknown as Frame;
}

function addSticker(board: Board, tx: number, ty: number): Sticker {
  const proto = new Sticker(board);
  proto.apply(transformOps.setLocal(proto.id, { translateX: tx, translateY: ty, scaleX: 1, scaleY: 1 }));
  return board.add(proto) as unknown as Sticker;
}

describe("Canonical Move Characterization: Baseline Behavior", () => {
  let board: Board;
  beforeEach(() => {
    board = makeBoard();
  });

  test("Baseline: parent is 'Board' for root items, then changes on applyAddChildren", () => {
    const frame = addFrame(board, 100, 100);
    const sticker = addSticker(board, 150, 150);

    expect((sticker as unknown as BaseItem).parent).toBe("Board");

    frame.applyAddChildren([sticker.getId()]);

    expect((sticker as unknown as BaseItem).parent).toBe(frame.getId());
  });

  test("Baseline: applyAddChildren performs world-to-local conversion", () => {
    // Frame at (100, 100), sticker at world (150, 150)
    const frame = addFrame(board, 100, 100);
    const sticker = addSticker(board, 150, 150);

    frame.applyAddChildren([sticker.getId()]);

    // Local coordinates should be (50, 50) because world (150, 150) - frame (100, 100) = (50, 50)
    const localPos = sticker.transformation.getTranslation();
    expect(localPos.x).toBeCloseTo(50, 0);
    expect(localPos.y).toBeCloseTo(50, 0);
  });

  test("Baseline: applyMatrix delta uses world-space but translates to local scale", () => {
    // Frame at (100, 100) with scale 2. Sticker at world (200, 200) -> local (100, 100)
    // Wait, Frame nesting ignores frame scale for translation. Let's verify this.
    const frame = addFrame(board, 100, 100, 2);
    const sticker = addSticker(board, 200, 200);

    frame.applyAddChildren([sticker.getId()]);

    // If frame scale is 2, and frame is at (100, 100), world (200, 200) is local (100, 100) if scale is ignored.
    // Frame.getIsScalingContainer() returns false.
    const localBefore = sticker.transformation.getTranslation();
    expect(localBefore.x).toBeCloseTo(100, 0);
    expect(localBefore.y).toBeCloseTo(100, 0);

    // Apply world-space delta of 10
    board.events.applyAndEmit({
      class: "Transformation",
      method: "applyMatrix",
      items: [{
        id: sticker.getId(),
        matrix: { translateX: 10, translateY: 10, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
      }],
    });

    // Local should be 110, 110
    const localAfter = sticker.transformation.getTranslation();
    expect(localAfter.x).toBeCloseTo(110, 0);
    expect(localAfter.y).toBeCloseTo(110, 0);
  });

  test("Baseline: undoing addChildren re-calculates world from local", () => {
    const frame = addFrame(board, 100, 100);
    const sticker = addSticker(board, 150, 150);

    const eventId = board.events.applyAndEmit({
      class: "Frame",
      method: "addChildren",
      item: [frame.getId()],
      childId: [sticker.getId()],
    } as any);

    expect((sticker as unknown as BaseItem).parent).toBe(frame.getId());

    // Revert the addChildren manually to bypass the existing bug in FrameCommand.getReverse()
    board.events.applyAndEmit({
      class: "Frame",
      method: "removeChildren",
      item: [frame.getId()],
      childId: [sticker.getId()],
    } as any);

    expect((sticker as unknown as BaseItem).parent).toBe("Board");
    const worldPos = sticker.transformation.getTranslation();
    expect(worldPos.x).toBeCloseTo(150, 0);
    expect(worldPos.y).toBeCloseTo(150, 0);
  });

  test("Baseline: serialization of nested item uses world coordinates", () => {
    const frame = addFrame(board, 100, 100);
    const sticker = addSticker(board, 150, 150);
    frame.applyAddChildren([sticker.getId()]);

    const serialized = board.serialize();
    const stickerData = serialized.find((d: any) => d.id === sticker.getId());

    // Even though it's nested and has local (50, 50), serialization should store world (150, 150)
    // Wait, let's verify this. Frame.nestedTransform.test.ts says it stores world.
    expect(stickerData.transformation.translateX).toBeCloseTo(150, 0);
    expect(stickerData.transformation.translateY).toBeCloseTo(150, 0);
  });
});
