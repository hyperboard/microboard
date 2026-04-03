import { Transformation } from "./Transformation";
import { TransformationOperation, MatrixData } from "./TransformationOperations";
import type { Command } from "../../Events/Command";
import type { Operation } from "../../Events/EventsOperations";
import { isTransformation } from "../../Events/EventsOperations";

/** Minimal interface to avoid circular import with BaseItem/Item */
interface TransformableItem {
	apply(op: Operation): void;
	transformation: Transformation;
}

export class TransformationCommand implements Command {
	reverse: {
		item: Transformation;
		operation: TransformationOperation;
	}[];

	/** Map from Transformation → Item, populated when items are passed to the constructor. */
	private itemsMap: Map<Transformation, TransformableItem> = new Map();

	// TODO HANDLE MULTIPLE OPERATIONS

	constructor(
		private transformation: Transformation[],
		private operation: TransformationOperation,
		items?: TransformableItem[],
	) {
		if (items) {
			for (const item of items) {
				this.itemsMap.set(item.transformation, item);
			}
		}
		this.reverse = this.getReverse();
	}

	merge(op: Operation): this {
		if (isTransformation(op)) {
			// Merge logic: Collapsing drag streams by comparing timeStamp (gesture boundaries).
			if (this.operation.timeStamp !== undefined && this.operation.timeStamp === op.timeStamp) {
				this.operation = op;
				this.reverse = this.getReverse();
				return this;
			}
		}
		return this;
	}

	apply(): void {
		for (const transformation of this.transformation) {
			const item = this.itemsMap.get(transformation);
			if (item) {
				item.apply(this.operation);
			} else {
				transformation.apply(this.operation);
			}
		}
	}

	revert(): void {
		this.reverse.forEach(({ item: transformation, operation }) => {
			const item = this.itemsMap.get(transformation);
			if (item) {
				item.apply(operation);
			} else {
				transformation.apply(operation);
			}
		});
	}

	getReverse(): {
		item: Transformation;
		operation: TransformationOperation;
	}[] {
		const op = this.operation;

		switch (op.method) {
			case "applyMatrix": {
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
			case "rotateTo":
				if (op.method === "rotateTo") {
					return this.transformation.map(transformation => {
						return {
							item: transformation,
							operation: {
								...op,
								degree: transformation.getRotation(),
							},
						} as { item: Transformation; operation: TransformationOperation };
					});
				}
				return [];
			case "rotateBy": {
				if (op.method === "rotateBy") {
					return this.transformation.map(transformation => {
						return {
							item: transformation,
							operation: {
								...op,
								degree: -op.degree,
							},
						} as { item: Transformation; operation: TransformationOperation };
					});
				}
				return [];
			}
			case "transformMany": {
				if (op.method === "transformMany") {
					const { items } = op;
					return this.transformation.map(currTrans => {
						const subOp = items[currTrans.getId()];
						if (subOp && subOp.method === "applyMatrix") {
							const itemOp = subOp.items.find(i => i.id === currTrans.getId());
							if (itemOp) {
								return {
									item: currTrans,
									operation: {
										class: "Transformation" as const,
										method: "applyMatrix" as const,
										items: [{
											id: currTrans.getId(),
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
								} as { item: Transformation; operation: TransformationOperation };
							}
						}
						// Fallback if subOp is not applyMatrix or not found
						return {
							item: currTrans,
							operation: {
								class: "Transformation" as const,
								method: "applyMatrix" as const,
								items: [{
									id: currTrans.getId(),
									matrix: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
								}],
							},
						} as { item: Transformation; operation: TransformationOperation };
					});
				}
				return [];
			}
			case "locked": {
				if (op.method === "locked") {
					return this.transformation.map(transformation => {
						return {
							item: transformation,
							operation: {
								...op,
								item: [...op.item],
								method: "unlocked",
								locked: false,
							} as TransformationOperation,
						};
					});
				}
				return [];
			}
			case "unlocked": {
				if (op.method === "unlocked") {
					return this.transformation.map(transformation => {
						return {
							item: transformation,
							operation: {
								...op,
								item: [...op.item],
								method: "locked",
								locked: true,
							} as TransformationOperation,
						};
					});
				}
				return [];
			}
			case "translateBy":
				return this.transformation.map(t => ({
					item: t,
					operation: { ...op, x: -op.x, y: -op.y },
				}));
			case "translateTo":
				return this.transformation.map(t => ({
					item: t,
					operation: { ...op, x: t.previous.translateX, y: t.previous.translateY },
				}));
			case "scaleBy":
				return this.transformation.map(t => ({
					item: t,
					operation: { ...op, x: 1 / op.x, y: 1 / op.y },
				}));
			case "scaleTo":
				return this.transformation.map(t => ({
					item: t,
					operation: { ...op, x: t.previous.scaleX, y: t.previous.scaleY },
				}));
			case "scaleByTranslateBy":
				return this.transformation.map(t => ({
					item: t,
					operation: {
						...op,
						scale: { x: 1 / op.scale.x, y: 1 / op.scale.y },
						translate: { x: -op.translate.x, y: -op.translate.y },
					},
				}));
			case "move": {
				return this.transformation.map(t => {
					const itemOp = op.items.find(i => i.id === t.getId());
					if (!itemOp) return { item: t, operation: op };
					return {
						item: t,
						operation: {
							class: "Transformation",
							method: "move",
							items: [{
								id: t.getId(),
								worldMatrix: itemOp.prevWorldMatrix,
								prevWorldMatrix: itemOp.worldMatrix,
							}],
							timeStamp: op.timeStamp,
						} as TransformationOperation,
					};
				});
			}
			case "setPlacement": {
				return this.transformation.map(t => {
					const itemOp = op.items.find(i => i.id === t.getId());
					if (!itemOp) return { item: t, operation: op };
					return {
						item: t,
						operation: {
							class: "Transformation",
							method: "setPlacement",
							items: [{
								id: t.getId(),
								parentId: itemOp.prevParentId,
								prevParentId: itemOp.parentId,
								zOrderIndex: 0, // Note: prev z-order tracking is complex, usually resolved by OT
								worldMatrix: itemOp.prevWorldMatrix,
								prevWorldMatrix: itemOp.worldMatrix,
							}],
							timeStamp: op.timeStamp,
						} as TransformationOperation,
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
