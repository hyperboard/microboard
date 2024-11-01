import { Transformation } from "./Transformation";
import { TransformationOperation } from "./TransformationOperations";
import { Command } from "../../Events";
import { mapItemsByOperation } from "../ItemsCommandUtils";

export class TransformationCommand implements Command {
	reverse: {
		item: Transformation;
		operation: TransformationOperation;
	}[];

	// TODO HANDLE MULTIPLE OPERATIONS

	constructor(
		private transformation: Transformation[],
		private operation: TransformationOperation,
	) {
		this.reverse = this.getReverse();
	}

	apply(): void {
		for (const transformation of this.transformation) {
			transformation.apply(this.operation);
		}
	}

	revert(): void {
		this.reverse.forEach(({ item, operation }) => {
			item.apply(operation);
		});
	}

	getReverse(): {
		item: Transformation;
		operation: TransformationOperation;
	}[] {
		const op = this.operation;

		switch (this.operation.method) {
			case "translateTo":
				return mapItemsByOperation(
					this.transformation,
					transformation => {
						return {
							...this.operation,
							x: transformation.getTranslation().x,
							y: transformation.getTranslation().y,
						};
					},
				);
			case "translateBy": {
				const op = this.operation;
				return mapItemsByOperation(this.transformation, () => {
					return {
						...this.operation,
						x: -op.x,
						y: -op.y,
					};
				});
			}
			case "scaleTo":
			case "scaleToRelativeTo": {
				return mapItemsByOperation(
					this.transformation,
					transformation => {
						return {
							...op,
							x: transformation.getScale().x,
							y: transformation.getScale().y,
						};
					},
				);
			}
			case "scaleBy":
			case "scaleByRelativeTo": {
				const op = this.operation;
				return mapItemsByOperation(this.transformation, () => {
					return {
						...op,
						x: 1 / op.x,
						y: 1 / op.y,
					};
				});
			}
			case "rotateTo":
				return mapItemsByOperation(
					this.transformation,
					transformation => {
						return {
							...this.operation,
							degree: transformation.getRotation(),
						};
					},
				);
			case "scaleByTranslateBy": {
				const op = this.operation;
				const scaleTransformation = mapItemsByOperation(
					this.transformation,
					() => {
						const scaleX = 1 / op.scale.x;
						const scaleY = 1 / op.scale.y;
						const translateX = -op.translate.x;
						const translateY = -op.translate.y;
						return {
							...op,
							scale: {
								x: scaleX,
								y: scaleY,
							},
							translate: {
								x: translateX,
								y: translateY,
							},
						};
					},
				);
				return scaleTransformation;
			}
			case "rotateBy": {
				const op = this.operation;
				return mapItemsByOperation(this.transformation, () => {
					return {
						...this.operation,
						degree: -op.degree,
					};
				});
			}
			case "transformMany": {
				const { operation, transformation } = this;
				return transformation.map(currTrans => {
					const op = operation.items[currTrans.getId()];
					let reverseOp;
					if (op.method === "scaleByTranslateBy") {
						reverseOp = {
							...op,
							scale: { x: 1 / op.scale.x, y: 1 / op.scale.y },
							translate: {
								x: -op.translate.x,
								y: -op.translate.y,
							},
						};
					} else if (op.method === "translateTo") {
						reverseOp = {
							...op,
							x: currTrans.getTranslation().x,
							y: currTrans.getTranslation().y,
						};
					} else if (op.method === "translateBy") {
						reverseOp = {
							...op,
							x: -op.x,
							y: -op.y,
						};
					} else if (op.method === "scaleTo") {
						reverseOp = {
							...op,
							x: currTrans.getScale().x,
							y: currTrans.getScale().y,
						};
					} else if (op.method === "scaleBy") {
						reverseOp = {
							...op,
							x: 1 / op.x,
							y: 1 / op.y,
						};
					}
					return { item: currTrans, operation: reverseOp };
				});
			}
			default:
				return [
					{ item: this.transformation[0], operation: this.operation },
				];
		}
	}
}
