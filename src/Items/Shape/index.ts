import { BasicShapes } from "./Basic";
import { BPMN } from "./BPMN";

export { Shape, Shapes } from "./Shape";
export { ShapeCommand } from "./ShapeCommand";
export { ShapeOperation } from "./ShapeOperation";
export { ShapeData, DefaultShapeData } from "./ShapeData";
export type ShapeType = keyof typeof BasicShapes | BPMN;
