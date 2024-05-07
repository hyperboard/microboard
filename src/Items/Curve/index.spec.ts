import { describe, expect, test } from "@jest/globals";
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

	test("finds bounds", () => {
		const rect = curve.getMbr();
		expect(rect.left).toBe(0);
		expect(rect.top).toBe(-1);
		expect(rect.right).toBe(100);
		expect(rect.bottom).toBe(50);
	});

	test("finds if item is in bounds by point", () => {
		const intersects = new Mbr(0, -10, 50, 100);
		expect(curve.isEnclosedOrCrossedBy(intersects)).toBe(true);
		const contains = new Mbr(-10, -10, 110, 110);
		expect(curve.isEnclosedOrCrossedBy(contains)).toBe(true);
	});

	test("finds intersection with line segment", () => {
		const line = new Line(new Point(50, 25), new Point(200, 25));
		const intersections = curve.getIntersectionPoints(line);
		expect(intersections.length).toBe(1);
	});

	test("finds intersection with infinite line", () => {
		const line = new Line(
			new Point(50, 25),
			new Point(Number.MAX_VALUE, 25),
		);
		const intersections = curve.getIntersectionPoints(line);
		expect(intersections.length).toBe(1);
	});
});
