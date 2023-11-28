import { Mbr, Point } from "Board/Items";
import { assert } from "chai";
import { getResize } from "./getResizeMatrix";

describe("of transformer", () => {
	describe("computes resize matrix", () => {
		it("for right resize type", () => {
			const mbr = new Mbr(0, 0, 100, 100);
			const resizeType = "right";
			const pointer = new Point(50, 50);
			const opposite = new Point(0, 0);
			const matrix = getResize(resizeType, pointer, mbr, opposite);
			assert.equal(matrix.translateX, 0);
			assert.equal(matrix.translateY, 0);
			assert.equal(matrix.scaleX, 0.5);
			assert.equal(matrix.scaleY, 1);
		});
		it("for right resize type over the left side", () => {
			const mbr = new Mbr(0, 0, 100, 100);
			const resizeType = "right";
			const pointer = new Point(-50, 50);
			const opposite = new Point(0, 0);
			const matrix = getResize(resizeType, pointer, mbr, opposite);
			assert.equal(matrix.translateX, -50);
			assert.equal(matrix.translateY, 0);
			assert.equal(matrix.scaleX, 0.5);
			assert.equal(matrix.scaleY, 1);
		});
	});
	describe("applies resize matrix", () => {
		it("for right resize type over the left side", () => {
			const mbr = new Mbr(0, 0, 100, 100);
			const resizeType = "right";
			const pointer = new Point(-50, 50);
			const opposite = new Point(0, 0);
			const matrix = getResize(resizeType, pointer, mbr, opposite);
			const newMbr = mbr.copy();
			newMbr.transform(matrix);
			assert.equal(newMbr.left, -50);
			assert.equal(newMbr.top, 0);
			assert.equal(newMbr.right, 0);
			assert.equal(newMbr.bottom, 100);
			assert.equal(newMbr.getWidth(), 50);
			assert.equal(newMbr.getHeight(), 100);
		});
		it("for right resize type over the left side in 0,0", () => {
			const mbr = new Mbr(0, 0, 100, 100);
			const resizeType = "right";
			const pointer = new Point(0, 0);
			const opposite = new Point(0, 0);
			const matrix = getResize(resizeType, pointer, mbr, opposite);
			const newMbr = mbr.copy();
			newMbr.transform(matrix);
			assert.equal(newMbr.left, 0);
			assert.equal(newMbr.top, 0);
			assert.equal(newMbr.right, 0);
			assert.equal(newMbr.bottom, 100);
			assert.equal(newMbr.getWidth(), 0);
			assert.equal(newMbr.getHeight(), 100);
			const secondPointer = new Point(-50, 50);
			const secondMatrix = getResize(
				resizeType,
				secondPointer,
				newMbr,
				opposite,
			);
			const secondNewMbr = newMbr.copy();
			secondNewMbr.transform(secondMatrix);
			assert.equal(secondNewMbr.left, -50);
			assert.equal(secondNewMbr.top, 0);
			assert.equal(secondNewMbr.right, 0);
			assert.equal(secondNewMbr.bottom, 100);
			assert.equal(secondNewMbr.getWidth(), 50);
			assert.equal(secondNewMbr.getHeight(), 100);
		});
	});
});
