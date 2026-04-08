import { beforeAll, describe, expect, it } from "bun:test";
import { Board } from "Board";
import { Point } from "Geometry/Point";
import { Connector } from "Items/Connector";
import { FixedPoint } from "Items/Connector/ControlPoint";
import { Shape } from "Items/Shape";
import { initNodeSettings } from "api/initNodeSettings";

beforeAll(() => {
  initNodeSettings();
});

function createBoardWithGroupedConnector(): Board {
  const board = new Board("board-html");
  board.setName("HTML round-trip");

  const startItem = board.createItem("start-item", {
    itemType: "Shape",
    shapeType: "Rectangle",
    transformation: {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      shearX: 0,
      shearY: 0,
      rotate: 0,
      isLocked: false,
    },
  } as any) as Shape;
  const endItem = board.createItem("end-item", {
    itemType: "Shape",
    shapeType: "Rectangle",
    transformation: {
      translateX: 240,
      translateY: 80,
      scaleX: 1,
      scaleY: 1,
      shearX: 0,
      shearY: 0,
      rotate: 0,
      isLocked: false,
    },
  } as any) as Shape;
  board.index.insert(startItem);
  board.index.insert(endItem);

  const connector = new Connector(board, "connector-1");
  connector.deserialize({
    itemType: "Connector",
    startPoint: new FixedPoint(startItem, new Point(100, 50)).serialize(),
    endPoint: new FixedPoint(endItem, new Point(0, 50)).serialize(),
  } as any);
  board.index.insert(connector);

  board.group([startItem, endItem, connector]);
  return board;
}

describe("Board HTML adapter", () => {
  it.skip("round-trips board snapshots through codec-backed HTML without CDN preview assets", () => {
    const board = createBoardWithGroupedConnector();

    const html = board.serializeHTML();

    expect(html).toContain("<microboard-document");
    expect(html).not.toContain("unpkg.com");
    expect(html).toContain("Open Board In Editor");

    const restored = new Board();
    restored.deserializeHTML(html);

    expect(restored.serialize()).toEqual(board.serialize());
    expect(restored.getName()).toBe("HTML round-trip");
  });

  it.skip("remaps imported item ids and connector references when adding HTML into another board", () => {
    const source = createBoardWithGroupedConnector();
    const html = source.serializeHTML();
    const sourceIds = new Set(source.serialize().map((item) => item.id));

    const target = new Board();
    const addedIds = target.deserializeHTMLAndEmit(html);
    const imported = target.serialize();

    expect(addedIds).toHaveLength(source.serialize().length);
    expect(imported).toHaveLength(source.serialize().length);
    expect(addedIds.some((id) => sourceIds.has(id))).toBe(false);

    const importedConnector = imported.find((item) => item.itemType === "Connector") as any;
    expect(importedConnector).toBeDefined();
    expect(sourceIds.has(importedConnector.startPoint.itemId)).toBe(false);
    expect(sourceIds.has(importedConnector.endPoint.itemId)).toBe(false);
    expect(addedIds).toContain(importedConnector.startPoint.itemId);
    expect(addedIds).toContain(importedConnector.endPoint.itemId);
  });
});
