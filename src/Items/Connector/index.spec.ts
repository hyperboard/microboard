import { beforeAll, describe, expect, it } from "bun:test";
import { Board } from "Board";
import { initNodeSettings } from "api/initNodeSettings";
import { Point } from "../Point";
import { Shape } from "../Shape";
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
});
