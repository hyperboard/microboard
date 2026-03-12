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

	merge(op: TransformationOperation): this {
		this.operation = op;
		this.reverse = this.getReverse();
		return this;
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
			case "applyMatrix": {
				const op = this.operation;
				return this.transformation.map(t => {
					const itemOp = op.items.find(i => i.id === t.getId());
					if (!itemOp) return { item: t, operation: op };
					return {
						item: t,
						operation: {
							class: "Transformation" as const,
							method: "applyMatrix" as const,
							items: [{
								id: t.getId(),
								matrix: {
									translateX: -itemOp.matrix.translateX,
									translateY: -itemOp.matrix.translateY,
									scaleX: 1 / itemOp.matrix.scaleX,
									scaleY: 1 / itemOp.matrix.scaleY,
									shearX: 0,
									shearY: 0,
								},
							}],
						},
					};
				});
			}
			// @deprecated — legacy events only
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
			// @deprecated — legacy events only
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
			// end @deprecated
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
					const m = op.method === "applyMatrix" ? op.matrix
						: op.method === "scaleByTranslateBy" ? { translateX: -op.translate.x, translateY: -op.translate.y, scaleX: 1 / op.scale.x, scaleY: 1 / op.scale.y, shearX: 0, shearY: 0 }
						: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 };
					return {
						item: currTrans,
						operation: {
							class: "Transformation" as const,
							method: "applyMatrix" as const,
							items: [{
								id: currTrans.getId(),
								matrix: {
									translateX: op.method === "applyMatrix" ? -m.translateX : m.translateX,
									translateY: op.method === "applyMatrix" ? -m.translateY : m.translateY,
									scaleX: op.method === "applyMatrix" ? 1 / m.scaleX : m.scaleX,
									scaleY: op.method === "applyMatrix" ? 1 / m.scaleY : m.scaleY,
									shearX: 0,
									shearY: 0,
								},
							}],
						},
					};
				});
			}
			case "locked": {
				const op = this.operation;
				return mapItemsByOperation(this.transformation, () => {
					return {
						...op,
						item: [...op.item],
						method: "unlocked",
						locked: false,
					};
				});
			}
			case "unlocked": {
				const op = this.operation;
				return mapItemsByOperation(this.transformation, () => {
					return {
						...op,
						item: [...op.item],
						method: "locked",
						locked: true,
					};
				});
			}
			default:
				return [
					{ item: this.transformation[0], operation: this.operation },
				];
		}
	}
}
