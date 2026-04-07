import { beforeAll, describe, expect, it } from "bun:test";
import { Board } from "Board";
import { initNodeSettings } from "api/initNodeSettings";
import { CanvasIRBadge } from "./index";
import { Point } from "Geometry/Point";
import { Mbr } from "Geometry/Mbr";
import { transformOps } from "Geometry/Transformation/transformOps";

beforeAll(() => {
  initNodeSettings();
});

describe("CanvasIRBadge", () => {
  it("derives geometry from renderToCanvasIR", () => {
    const item = new CanvasIRBadge(new Board());

    expect(item.getMbr().getWidth()).toBeGreaterThan(150);
    expect(item.getMbr().getHeight()).toBeGreaterThan(95);
    expect(item.isUnderPoint(new Point(20, 20))).toBe(true);
    expect(item.getPath().getSvgPath().length).toBeGreaterThan(0);
  });

  it("updates geometry after transformation", () => {
    const item = new CanvasIRBadge(new Board());
    item.apply(transformOps.translateTo(item, 40, 60));

    const mbr = item.getMbr();
    expect(mbr.left).toBeGreaterThan(38);
    expect(item.isEnclosedOrCrossedBy(new Mbr(35, 55, 220, 220))).toBe(true);
  });
});
