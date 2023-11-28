import { assert } from "chai";
import { Mbr } from ".";
import { Matrix } from "..";

describe("Mbr", () => {
	it("increases bounds from center", () => {
		const rect = new Mbr(-10, -10, 100, 100);
		rect.scaleFromCenter(new Matrix(0, 0, 2, 3));
		assert.isTrue(
			rect.left === -20 &&
				rect.top === -30 &&
				rect.right === 200 &&
				rect.bottom === 300,
		);
	});
	/*

	it("decreases bounds from center", () => {
		const scale = {
			x: 0.2,
			y: 0.3,
		};
		expect(getBoundsScaledFromCenter(rect, scale)).toEqual({
			left: -2,
			top: -3,
			right: 20,
			bottom: 30,
		});
	});

	it("increases bounds from left top", () => {
		const scale = {
			x: 2,
			y: 3,
		};
		expect(getBoundsScaledFromLeftTop(rect, scale)).toEqual({
			left: -10,
			top: -10,
			right: 210,
			bottom: 320,
		});
	});

	it("decreases bounds from left top", () => {
		const scale = {
			x: 0.2,
			y: 0.3,
		};
		expect(getBoundsScaledFromLeftTop(rect, scale)).toEqual({
			left: -10,
			top: -10,
			right: 110 * 0.2 - 10,
			bottom: 110 * 0.3 - 10,
		});
	});
	describe("isBoundsInBounds", () => {
	const BoundsA = {
		left: 0,
		top: 0,
		right: 100,
		bottom: 100,
	};
	it("finds bounds in bounds by point", () => {
		const BoundsB = {
			left: 50,
			top: 50,
			right: 150,
			bottom: 150,
		};
		expect(isBoundsInBoundsByPoint(BoundsB, BoundsA)).toBe(true);
		const BoundsC = {
			left: 50,
			top: 50,
			right: 75,
			bottom: 75,
		};
		expect(isBoundsInBoundsByPoint(BoundsC, BoundsA)).toBe(true);
		const BoundsD = {
			left: 150,
			top: 150,
			right: 200,
			bottom: 200,
		};
		expect(isBoundsInBoundsByPoint(BoundsD, BoundsA)).toBe(false);
	});
});

*/
});
