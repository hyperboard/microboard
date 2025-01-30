import { Point, Shape } from "Board/Items";
import { Pointer } from "Board/Pointer";
import { Camera } from "Board/Camera/Camera";
import { assert } from "chai";
import { SpatialIndex } from "./SpacialIndex";
import { Board } from "Board";

describe("to find items in space, a user", () => {
	it("finds nearest point on an item nearest to pointer", () => {
		const board = new Board();
		const pointer = new Pointer();
		const index = new SpatialIndex(new Camera(pointer), pointer);
		index.insert(new Shape(board));
		const nearestItem = index.items.getNearPointer(10, 1)[0];
		const nearestPoint = nearestItem.getNearestEdgePointTo(new Point(0, 0));
		assert.equal(nearestPoint.x, 0);
		assert.equal(nearestPoint.y, 0);
	});
});
