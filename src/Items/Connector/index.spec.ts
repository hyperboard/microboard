import { beforeAll, describe, expect, it } from "bun:test";
import { Board } from "Board";
import { initNodeSettings } from "api/initNodeSettings";
import { Mbr } from "../Mbr/Mbr";
import { Point } from "../Point";
import { Shape } from "../Shape";
import { transformOps } from "../Transformation/transformOps";
import { Connector } from ".";
import { FixedPoint, BoardPoint } from "./ControlPoint";

beforeAll(() => {
	initNodeSettings();
});

describe("of connectors", () => {
	it("resolves the start point item via optionalFindItemFn", () => {
		const board = new Board();
		const shape = board.createItem("shape-1", { itemType: "Shape", shapeType: "Rectangle" } as any) as Shape;
		const connector = new Connector(board);
		const fixedPoint = new FixedPoint(shape, new Point(0, shape.getMbr().getHeight() / 2));

		connector.deserialize({
			itemType: "Connector",
			startPoint: fixedPoint.serialize(),
			endPoint: { pointType: "Board", x: 100, y: 100 },
			optionalFindItemFn: (id: string) => (id === shape.getId() ? shape : undefined),
		} as any);

		const startPoint = connector.getStartPoint();
		expect(startPoint.pointType).toBe("Fixed");
		expect(startPoint.pointType !== "Board" && startPoint.item).toBe(shape);
	});

	it("keeps connector attachment stable when translating a group", () => {
		const board = new Board();
		const startItem = board.createItem("start-item", { itemType: "Shape", shapeType: "Rectangle", transformation: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, rotate: 0, isLocked: false } } as any) as Shape;
		const endItem = board.createItem("end-item", { itemType: "Shape", shapeType: "Rectangle", transformation: { translateX: 200, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, rotate: 0, isLocked: false } } as any) as Shape;
		board.index.insert(startItem);
		board.index.insert(endItem);

		const connector = new Connector(board, "connector-1");
		connector.deserialize({
			itemType: "Connector",
			startPoint: new FixedPoint(startItem, new Point(100, 50)).serialize(),
			endPoint: new FixedPoint(endItem, new Point(0, 50)).serialize(),
		} as any);
		board.index.insert(connector);

		const group = board.group([startItem, endItem, connector]);
		const startBefore = connector.getStartPoint().copy();
		const endBefore = connector.getEndPoint().copy();

		group.apply(transformOps.translateBy(group, 150, 80));

		expect(connector.getStartPoint().serialize()).toEqual({
			pointType: "Fixed",
			itemId: "start-item",
			relativeX: 100,
			relativeY: 50,
		});
		expect(connector.getEndPoint().serialize()).toEqual({
			pointType: "Fixed",
			itemId: "end-item",
			relativeX: 0,
			relativeY: 50,
		});

		const startAfter = connector.getStartPoint().copy();
		const endAfter = connector.getEndPoint().copy();
		startAfter.transform(group.getWorldMatrix());
		endAfter.transform(group.getWorldMatrix());

		expect(startAfter.x).toBeCloseTo(startBefore.x + 150, 6);
		expect(startAfter.y).toBeCloseTo(startBefore.y + 80, 6);
		expect(endAfter.x).toBeCloseTo(endBefore.x + 150, 6);
		expect(endAfter.y).toBeCloseTo(endBefore.y + 80, 6);
	});

	it("restores grouped connector endpoints after snapshot reload", () => {
		const board = new Board();
		const startItem = board.createItem("start-item", { itemType: "Shape", shapeType: "Rectangle", transformation: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, rotate: 0, isLocked: false } } as any) as Shape;
		const endItem = board.createItem("end-item", { itemType: "Shape", shapeType: "Rectangle", transformation: { translateX: 200, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, rotate: 0, isLocked: false } } as any) as Shape;
		board.index.insert(startItem);
		board.index.insert(endItem);

		const connector = new Connector(board, "connector-1");
		connector.deserialize({
			itemType: "Connector",
			startPoint: new FixedPoint(startItem, new Point(100, 50)).serialize(),
			endPoint: new FixedPoint(endItem, new Point(0, 50)).serialize(),
		} as any);
		board.index.insert(connector);

		const group = board.group([startItem, endItem, connector]);

		// Snapshot before movement (but after grouping)
		const snapshotStr = JSON.stringify(board.index.copy());

		group.apply(transformOps.translateBy(group, 150, 80));

		const startMoved = connector.getStartPoint().copy();
		const endMoved = connector.getEndPoint().copy();

		// Simulate reload
		const boardRestored = new Board();
		boardRestored.deserialize({
			items: JSON.parse(snapshotStr),
			events: [],
			lastIndex: 0
		});

		const restoredConnector = boardRestored.items.getById("connector-1") as Connector;
		const restoredStart = restoredConnector.getStartPoint();
		const restoredEnd = restoredConnector.getEndPoint();

		expect(restoredConnector).toBeDefined();
		expect(restoredStart.pointType).toBe("Fixed");
		expect(restoredEnd.pointType).toBe("Fixed");
		
		// The restored points should NOT be at 0,0 because the items have fixed positions in the snapshot
		expect(restoredStart.x).not.toBe(0);
		expect(restoredStart.y).not.toBe(0);
		expect(restoredEnd.x).not.toBe(0);
		expect(restoredEnd.y).not.toBe(0);

		// They should match the original pre-move coordinates (which were 100,50 and 200,50)
		expect(restoredStart.x).toBe(100);
		expect(restoredStart.y).toBe(50);
		expect(restoredEnd.x).toBe(200);
		expect(restoredEnd.y).toBe(50);
	});
});
