import { Pointer } from "Board/Pointer";
import { assert } from "chai";
import { Camera } from "./Camera";

describe("to view the diagram, a user", () => {
	it("zooms in to pointer", () => {
		const view = new Camera();
		view.pointTo(10, 10);
		view.zoomRelativeToPointerBy(2);
		assert.deepEqual(view.getTranslation(), { x: -10, y: -10 });
		assert.equal(view.getScale(), 2);
		view.pointTo(40, 40);
		view.zoomRelativeToPointerBy(2);
		view.zoomRelativeToPointerBy(0.132312);
		view.zoomRelativeToPointerBy(0.1321312);
		assert.deepEqual(view.getTranslation(), { x: -10, y: -10 });
		assert.equal(view.getScale(), 4);
	});
	it("points to the board", () => {
		const pointer = new Pointer();
		const view = new Camera(pointer);
		view.zoomRelativeToPointerBy(2);
		view.pointTo(10, 10);
		assert.equal(pointer.point.x, 5);
		assert.equal(pointer.point.y, 5);
		view.translateBy(10, 10);
		assert.equal(pointer.point.x, 0);
		assert.equal(pointer.point.y, 0);
	});
});
