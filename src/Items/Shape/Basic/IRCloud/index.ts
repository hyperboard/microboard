import { Mbr } from "Geometry/Mbr/Mbr";
import { createCanvasIRPath } from "Geometry/Path/CanvasIRPath";
import { Point } from "Geometry/Point/Point";

export const IRCloud = {
  name: "IRCloud",
  textBounds: new Mbr(20, 20, 80, 80),
  path: createCanvasIRPath((ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 50);
    ctx.bezierCurveTo(0, 40, 5, 35, 15, 35);
    ctx.bezierCurveTo(15, 35, 5, 25, 15, 15);
    ctx.bezierCurveTo(25, 5, 35, 15, 35, 15);
    ctx.bezierCurveTo(35, 10, 40, 0, 50, 0);
    ctx.bezierCurveTo(60, 0, 65, 10, 65, 15);
    ctx.bezierCurveTo(75, 5, 85, 15, 85, 15);
    ctx.bezierCurveTo(95, 25, 85, 35, 85, 35);
    ctx.bezierCurveTo(100, 35, 100, 50, 100, 50);
    ctx.bezierCurveTo(100, 65, 85, 65, 85, 65);
    ctx.bezierCurveTo(100, 80, 85, 90, 85, 90);
    ctx.bezierCurveTo(70, 95, 65, 85, 65, 85);
    ctx.bezierCurveTo(65, 90, 60, 100, 50, 100);
    ctx.bezierCurveTo(40, 100, 35, 90, 35, 85);
    ctx.bezierCurveTo(25, 95, 15, 90, 15, 90);
    ctx.bezierCurveTo(0, 80, 15, 65, 15, 65);
    ctx.bezierCurveTo(0, 65, 0, 50, 0, 50);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }),
  anchorPoints: [
    new Point(0, 50),
    new Point(15, 15),
    new Point(50, 0),
    new Point(85, 15),
    new Point(100, 50),
    new Point(85, 90),
    new Point(50, 100),
    new Point(15, 90),
  ],
  createPath: (_mbr: Mbr) => IRCloud.path.copy(),
  useMbrUnderPointer: false,
};
