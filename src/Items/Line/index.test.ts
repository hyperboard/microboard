import { assert } from "chai";
import { getLinesRelationType, Line } from ".";
import { Mbr } from "../Mbr";
import { Point } from "../Point";

describe("getLinesRelationType", () => {
	it("finds intersecting lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(10, 50), new Point(50, 10));
		const relation = getLinesRelationType(lineA, lineB);
		assert.equal(relation.type, "Intersecting");
	});

	it("finds non-intersecting lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(10, 50), new Point(20, 50));
		const relationAB = getLinesRelationType(lineA, lineB);
		assert.equal(relationAB.type, "NonIntersecting");
		const lineC = new Line(
			new Point(9.647128004639463, 24.409444195871874),
			new Point(Number.MAX_VALUE, 24.409444195871874),
		);
		const lineD = new Line(new Point(0, 25), new Point(25, 0));
		const relationCD = getLinesRelationType(lineC, lineD);
		assert.equal(relationCD.type, "NonIntersecting");
	});

	it("finds parallel lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(20, 20), new Point(20, 50));
		const relation = getLinesRelationType(lineA, lineB);
		assert.equal(relation.type, "Parallel");
	});

	it("finds colenear lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(60, 60), new Point(100, 100));
		const relation = getLinesRelationType(lineA, lineB);
		assert.equal(relation.type, "Colenear");
	});
});

describe("getIntersectionPointFromIntersectingLines", () => {});

describe("Line", () => {
	it("finds intersection point", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(10, 50), new Point(50, 10));
		const intersection = lineA.getIntersectionPoints(lineB)[0];
		assert.equal(intersection.x, 30);
		assert.equal(intersection.y, 30);
	});

	it("finds bounds", () => {
		const line = new Line(new Point(5, 5), new Point(50, 50));
		const rect = line.getMbr();
		assert.equal(rect.left, 5);
		assert.equal(rect.top, 5);
		assert.equal(rect.right, 50);
		assert.equal(rect.bottom, 50);
	});

	it("finds if item is in bounds by point", () => {
		const line = new Line(new Point(5, 5), new Point(50, 50));
		const intersects = new Mbr(0, -10, 40, 100);
		assert.isTrue(line.isEnclosedOrCrossedBy(intersects));
		const contains = new Mbr(-10, -10, 110, 110);
		assert.isTrue(line.isEnclosedOrCrossedBy(contains));
		const notInBounds = new Mbr(55, 55, 110, 110);
		assert.isTrue(line.isEnclosedOrCrossedBy(notInBounds));
	});

	it("finds intersection with infinite line", () => {
		const lineA = new Line(new Point(5, 5), new Point(50, 50));
		const lineB = new Line(
			new Point(5, 10),
			new Point(Number.MAX_VALUE, 10),
		);
		const intersections = lineA.getIntersectionPoints(lineB);
		assert.equal(intersections.length, 1);
	});
});
