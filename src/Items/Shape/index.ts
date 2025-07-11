import { BasicShapes } from "./Basic";
import { BPMN } from "./BPMN";

export { Shape, Shapes } from "./Shape";
export { ShapeCommand } from "./ShapeCommand";
export type { ShapeOperation } from "./ShapeOperation";
export * from "./ShapeData";
export type ShapeType = keyof typeof BasicShapes | BPMN;
export { DefaultShapeData } from "./ShapeData";
