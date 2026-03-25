import { Shape } from "./Shape";
import { SetBorderWidth, ShapeOperation } from "./ShapeOperation";
import { Command, Operation, isShapeOp } from "../../Events";

export class ShapeCommand implements Command {
	private reverse: { item: Shape; operation: ShapeOperation }[];

	constructor(
		private shape: Shape[],
		private operation: ShapeOperation,
	) {
		this.reverse = this.getReverse();
	}

	merge(op: Operation): this {
		if (isShapeOp(op)) {
			this.operation = op;
		}
		return this;
	}

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
				return shape.map(shape => {
					return {
						item: shape,
						operation: {
							...this.operation,
							backgroundColor: shape.getBackgroundColor(),
						},
					};
				});
			case "setBackgroundOpacity":
				return shape.map(shape => {
					return {
						item: shape,
						operation: {
							...this.operation,
							backgroundOpacity: shape.getBackgroundOpacity(),
						},
					};
				});
			case "setBorderColor":
				return shape.map(shape => {
					return {
						item: shape,
						operation: {
							...this.operation,
							borderColor: shape.getStrokeColor(),
						},
					};
				});
			case "setBorderOpacity":
				return shape.map(shape => {
					return {
						item: shape,
						operation: {
							...this.operation,
							borderOpacity: shape.getBorderOpacity(),
						},
					};
				});
			case "setBorderStyle":
				return shape.map(shape => {
					return {
						item: shape,
						operation: {
							...this.operation,
							borderStyle: shape.getBorderStyle(),
						},
					};
				});
			case "setBorderWidth":
				return shape.map(_shape => {
					return {
						item: _shape,
						operation: {
							...this.operation,
							borderWidth: (this.operation as SetBorderWidth)
								.prevBorderWidth,
						},
					};
				});
			case "setShapeType":
				return shape.map(shape => {
					return {
						item: shape,
						operation: {
							...this.operation,
							shapeType: shape.getShapeType(),
						},
					};
				});
		}
	}
}
