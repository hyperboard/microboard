import { beforeAll, describe, expect, it } from "bun:test";
import { Board } from "Board";
import { initNodeSettings } from "api/initNodeSettings";
import { BaseItem } from "../BaseItem/BaseItem";
import { Mbr } from "../Mbr/Mbr";
import { Point } from "../Point";
import { Shape } from "../Shape";
import { transformOps } from "../Transformation/transformOps";
import { Connector } from ".";
import { FixedPoint } from "./ControlPoint";

beforeAll(() => {
	initNodeSettings();
});

describe("of connectors", () => {
	it("resolves the start point item via optionalFindItemFn", () => {
		const board = new Board();
		const shape = new Shape(board, "shape-1");
		const connector = new Connector(board);
		const fixedPoint = new FixedPoint(shape, new Point(0, shape.getMbr().getHeight() / 2));

		connector.deserialize({
			itemType: "Connector",
			startPoint: fixedPoint.serialize(),
			endPoint: { pointType: "Board", x: 100, y: 100 },
			optionalFindItemFn: (id: string) => (id === shape.getId() ? shape : undefined),
		});

		const startPoint = connector.getStartPoint();
		expect(startPoint.pointType).toBe("Fixed");
		expect(startPoint.pointType !== "Board" && startPoint.item).toBe(shape);
	});

	it("keeps connector attachment stable when translating a group", () => {
		const board = new Board();
		const startItem = new BaseItem(board, "start-item");
		const endItem = new BaseItem(board, "end-item");
		startItem.setMbr(new Mbr(0, 0, 100, 100));
		endItem.setMbr(new Mbr(200, 0, 300, 100));
		board.index.insert(startItem);
		board.index.insert(endItem);

		const connector = new Connector(board, "connector-1");
		connector.deserialize({
			itemType: "Connector",
			startPoint: new FixedPoint(startItem, new Point(100, 50)).serialize(),
			endPoint: new FixedPoint(endItem, new Point(0, 50)).serialize(),
		});
		board.index.insert(connector);

		const group = board.group([startItem, endItem, connector]);
		const startBefore = connector.getStartPoint().serialize();
		const endBefore = connector.getEndPoint().serialize();

		group.apply(transformOps.translateBy(group, 150, 80));

		expect(connector.getStartPoint().serialize()).toEqual(startBefore);
		expect(connector.getEndPoint().serialize()).toEqual(endBefore);
	});
});
