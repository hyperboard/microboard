import { Shape } from "./Shape";
import { SetBorderWidth, ShapeOperation } from "./ShapeOperation";
import { Command } from "../../Events";
import { mapItemsByOperation } from "../ItemsCommandUtils";

export class ShapeCommand implements Command {
	private reverse = this.getReverse();

	constructor(private shape: Shape[], private operation: ShapeOperation) {}

	apply(): void {
		for (const shape of this.shape) {
			shape.apply(this.operation);
		}
	}

	revert(): void {
		for (const { item, operation } of this.reverse) {
			item.apply(operation);
		}
	}

	getReverse(): { item: Shape; operation: ShapeOperation }[] {
		const shape = this.shape;

		switch (this.operation.method) {
			case "setBackgroundColor":
				return mapItemsByOperation(shape, shape => {
					return {
						...this.operation,
						backgroundColor: shape.getBackgroundColor(),
					};
				});
			case "setBackgroundOpacity":
				return mapItemsByOperation(shape, shape => {
					return {
						...this.operation,
						backgroundOpacity: shape.getBackgroundOpacity(),
					};
				});
			case "setBorderColor":
				return mapItemsByOperation(shape, shape => {
					return {
						...this.operation,
						borderColor: shape.getStrokeColor(),
					};
				});
			case "setBorderOpacity":
				return mapItemsByOperation(shape, shape => {
					return {
						...this.operation,
						borderOpacity: shape.getBorderOpacity(),
					};
				});
			case "setBorderStyle":
				return mapItemsByOperation(shape, shape => {
					return {
						...this.operation,
						borderStyle: shape.getBorderStyle(),
					};
				});
			case "setBorderWidth":
				return mapItemsByOperation(shape, _shape => {
					return {
						...this.operation,
						borderWidth: (this.operation as SetBorderWidth)
							.prevBorderWidth,
					};
				});
			case "setShapeType":
				return mapItemsByOperation(shape, shape => {
					return {
						...this.operation,
						shapeType: shape.getShapeType(),
					};
				});
		}
	}
}
