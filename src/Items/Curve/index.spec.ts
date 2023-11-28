import { assert } from "chai";
import { CubicBezier } from ".";
import { Mbr } from "../Mbr";
import { Line } from "../Line";
import { Point } from "../Point";

describe("Curve", () => {
	const curve = new CubicBezier(
		new Point(0, 50),
		new Point(0, -18),
		new Point(100, 50),
		new Point(100, -18),
	);

	it("finds bounds", () => {
		const rect = curve.getMbr();
		assert.equal(rect.left, 0);
		assert.equal(rect.top, -1);
		assert.equal(rect.right, 100);
		assert.equal(rect.bottom, 50);
	});

	it("finds if item is in bounds by point", () => {
		const intersects = new Mbr(0, -10, 50, 100);
		assert.isTrue(curve.isEnclosedOrCrossedBy(intersects));
		const contains = new Mbr(-10, -10, 110, 110);
		assert.isTrue(curve.isEnclosedOrCrossedBy(contains));
	});

	it("finds intersection with line segment", () => {
		const line = new Line(new Point(50, 25), new Point(200, 25));
		const intersections = curve.getIntersectionPoints(line);
		assert.equal(intersections.length, 1);
	});

	it("finds intersection with infinite line", () => {
		const line = new Line(
			new Point(50, 25),
			new Point(Number.MAX_VALUE, 25),
		);
		const intersections = curve.getIntersectionPoints(line);
		assert.equal(intersections.length, 1);
	});
});
