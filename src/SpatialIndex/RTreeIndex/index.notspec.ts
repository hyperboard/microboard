/*
import { Mbr, Shape } from "Board/Items";
import { assert } from "chai";
import { RTreeIndex } from ".";

describe("RTreeIndex", () => {
	it("stores items", () => {
		const index = new RTreeIndex();
		const shapeA = new Shape();
		index.insert(shapeA);
		assert.equal(index.get("a"), shapeA);
	});
	it("finds enclosed items", () => {
		const index = new RTreeIndex();
		const shapeA = new Shape();
		const shapeB = new Shape();
		index.insert("a", shapeA);
		index.insert("b", shapeB);
		assert.equal(
			index.getEnclosedOrCrossedBy(new Mbr(0, 0, 50, 50)),
			[shapeA, shapeB],
		);
	});
});
*/
