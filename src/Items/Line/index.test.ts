import { describe, test, expect } from "@jest/globals";
import { getLinesRelationType, Line } from ".";
import { Mbr } from "../Mbr";
import { Point } from "../Point";

describe("getLinesRelationType", () => {
	test("finds intersecting lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(10, 50), new Point(50, 10));
		const relation = getLinesRelationType(lineA, lineB);
		expect(relation.type).toBe("Intersecting");
	});

	test("finds non-intersecting lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(10, 50), new Point(20, 50));
		const relationAB = getLinesRelationType(lineA, lineB);
		expect(relationAB.type).toBe("NonIntersecting");
		const lineC = new Line(
			new Point(9.647128004639463, 24.409444195871874),
			new Point(Number.MAX_VALUE, 24.409444195871874),
		);
		const lineD = new Line(new Point(0, 25), new Point(25, 0));
		const relationCD = getLinesRelationType(lineC, lineD);
		expect(relationCD.type).toBe("NonIntersecting");
	});

	test("finds parallel lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 10));
		const lineB = new Line(new Point(10, 20), new Point(50, 20));
		const relation = getLinesRelationType(lineA, lineB);
		expect(relation.type).toBe("Parallel");
	});

	test("finds colinear lines", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(60, 60), new Point(100, 100));
		const relation = getLinesRelationType(lineA, lineB);
		expect(relation.type).toBe("Colenear");
	});
});

describe("getIntersectionPointFromIntersectingLines", () => {});

describe("Line", () => {
	test("finds intersection point", () => {
		const lineA = new Line(new Point(10, 10), new Point(50, 50));
		const lineB = new Line(new Point(10, 50), new Point(50, 10));
		const intersection = lineA.getIntersectionPoints(lineB)[0];
		expect(intersection.x).toBe(30);
		expect(intersection.y).toBe(30);
	});

	test("finds bounds", () => {
		const line = new Line(new Point(5, 5), new Point(50, 50));
		const rect = line.getMbr();
		expect(rect.left).toBe(5);
		expect(rect.top).toBe(5);
		expect(rect.right).toBe(50);
		expect(rect.bottom).toBe(50);
	});

	test("finds if item is in bounds by point", () => {
		const line = new Line(new Point(5, 5), new Point(50, 50));
		const intersects = new Mbr(0, -10, 40, 100);
		expect(line.isEnclosedOrCrossedBy(intersects)).toBeTruthy();
		const contains = new Mbr(-10, -10, 110, 110);
		expect(line.isEnclosedOrCrossedBy(contains)).toBeTruthy();
		const notInBounds = new Mbr(55, 55, 110, 110);
		expect(!line.isEnclosedOrCrossedBy(notInBounds)).toBeTruthy();
	});

	test("finds intersection with infinite line", () => {
		const lineA = new Line(new Point(5, 5), new Point(50, 50));
		const lineB = new Line(
			new Point(5, 10),
			new Point(Number.MAX_VALUE, 10),
		);
		const intersections = lineA.getIntersectionPoints(lineB);
		expect(intersections.length).toBe(1);
	});
});
