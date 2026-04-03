import { initNodeSettings } from "../../api/initNodeSettings";
initNodeSettings();

import { expect, test, describe, beforeEach } from "bun:test";
import { Board } from "../../Board";
import { createEvents } from "../Events";
import { Shape } from "../../Items/Shape/Shape";
import { Frame } from "../../Items/Frame/Frame";
import { BaseItem } from "../../Items/BaseItem/BaseItem";
import { transformOps } from "../../Items/Transformation/transformOps";

describe("New Canonical Placement Operations", () => {
	let board: Board;
	let frame: Frame;
	let item: Shape;

	beforeEach(() => {
		board = new Board("test-board");
		board.events = createEvents(board, { sessionId: "test-session", subscribe: () => {} } as any, 0);
		frame = board.createItem("frame-1", { itemType: "Frame" }) as Frame;
		(frame as unknown as BaseItem).apply({
			class: "Transformation",
			method: "setLocalMatrix",
			item: ["frame-1"],
			matrix: { translateX: 100, translateY: 100, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
		} as any);
		board.index.insert(frame);

		item = board.createItem("item-1", { itemType: "Shape" }) as Shape;
		board.index.insert(item);
	});

	test("SetPlacement: root to frame correctly calculates local transform", () => {
		const worldMatrix = { translateX: 150, translateY: 150, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 };
		const op = transformOps.setPlacement([{
			id: "item-1",
			parentId: "frame-1",
			zOrderIndex: 0,
			worldMatrix,
			prevParentId: "Board",
			prevWorldMatrix: (item as unknown as BaseItem).getWorldMatrix(),
		}]);

		board.events.applyAndEmit(op);

		expect((item as unknown as BaseItem).parent).toBe("frame-1");
		// Local should be (150-100, 150-100) = (50, 50)
		const local = (item as unknown as BaseItem).transformation.toMatrix();
		expect(local.translateX).toBe(50);
		expect(local.translateY).toBe(50);
		// World should be as requested
		const world = (item as unknown as BaseItem).getWorldMatrix();
		expect(world.translateX).toBe(150);
		expect(world.translateY).toBe(150);
	});

	test("Move: updates world position within same parent", () => {
		// First put in frame
		(frame as unknown as BaseItem).addChildItems([item as unknown as BaseItem]);
		
		const worldMatrix = { translateX: 200, translateY: 200, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 };
		const op = transformOps.move([{
			id: "item-1",
			worldMatrix,
			prevWorldMatrix: (item as unknown as BaseItem).getWorldMatrix(),
		}]);

		board.events.applyAndEmit(op);

		expect((item as unknown as BaseItem).parent).toBe("frame-1");
		// Local should be (200-100, 200-100) = (100, 100)
		const local = (item as unknown as BaseItem).transformation.toMatrix();
		expect(local.translateX).toBe(100);
		expect(local.translateY).toBe(100);
	});

	test("SetPlacement: undo restores parent and world position", () => {
		const oldWorld = (item as unknown as BaseItem).getWorldMatrix();
		const op = transformOps.setPlacement([{
			id: "item-1",
			parentId: "frame-1",
			zOrderIndex: 0,
			worldMatrix: { translateX: 150, translateY: 150, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
			prevParentId: "Board",
			prevWorldMatrix: oldWorld,
		}]);

		const eventId = board.events.applyAndEmit(op);
		expect((item as unknown as BaseItem).parent).toBe("frame-1");

		// Manually confirm EVERYTHING so undo() can find it
		const unconfirmedRecords = board.events.log.getUnorderedRecords();
		const allUnconfirmedIds = unconfirmedRecords.map(r => r.event.body.eventId);
		board.events.log.list.prepareRecordsToSend();
		board.events.log.confirmSentLocalEventIds(allUnconfirmedIds, 1);

		expect(board.events.log.list.isAllEventsConfirmed()).toBe(true);

		board.events.undo();

		expect((item as unknown as BaseItem).parent).toBe("Board");
		const currentWorld = (item as unknown as BaseItem).getWorldMatrix();
		expect(currentWorld.translateX).toBe(oldWorld.translateX);
		expect(currentWorld.translateY).toBe(oldWorld.translateY);
	});
});
