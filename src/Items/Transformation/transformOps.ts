import { MatrixData, TransformationOperation, MoveOperation, SetPlacementOperation } from "./TransformationOperations";

interface ItemLike {
	getId(): string;
	transformation: {
		getTranslation(): { x: number; y: number };
		getScale(): { x: number; y: number };
	};
}

type ItemOrId = ItemLike | string;

function idsOf(items: readonly ItemOrId[] | ItemOrId): string[] {
	const arr = Array.isArray(items) ? items : [items];
	return arr.map((item) => (typeof item === "string" ? item : item.getId()));
}

export const transformOps = {
	applyMatrix(items: readonly ItemOrId[] | ItemOrId, matrix: MatrixData, timeStamp?: number, silent?: boolean): TransformationOperation {
		const arr = Array.isArray(items) ? items : [items];
		return {
			class: "Transformation",
			method: "applyMatrix",
			items: arr.map((item) => ({
				id: typeof item === "string" ? item : item.getId(),
				matrix,
			})),
			timeStamp,
			silent,
		};
	},

	translateBy(items: readonly ItemOrId[] | ItemOrId, x: number, y: number, timeStamp?: number): TransformationOperation {
		return this.applyMatrix(items, {
			translateX: x,
			translateY: y,
			scaleX: 1,
			scaleY: 1,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	},

	translateTo(item: ItemLike, x: number, y: number, timeStamp?: number): TransformationOperation {
		const current = item.transformation.getTranslation();
		return this.translateBy(item, x - current.x, y - current.y, timeStamp);
	},

	scaleBy(items: readonly ItemOrId[] | ItemOrId, x: number, y: number, timeStamp?: number): TransformationOperation {
		return this.applyMatrix(items, {
			translateX: 0,
			translateY: 0,
			scaleX: x,
			scaleY: y,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	},

	scaleTo(item: ItemLike, x: number, y: number, timeStamp?: number): TransformationOperation {
		const current = item.transformation.getScale();
		return this.scaleBy(item, x / current.x, y / current.y, timeStamp);
	},

	rotateBy(items: readonly ItemOrId[] | ItemOrId, degree: number, timeStamp?: number): TransformationOperation {
		return {
			class: "Transformation",
			method: "rotateBy",
			item: idsOf(items),
			degree,
			timeStamp,
		};
	},

	rotateTo(items: readonly ItemOrId[] | ItemOrId, degree: number, timeStamp?: number): TransformationOperation {
		return {
			class: "Transformation",
			method: "rotateTo",
			item: idsOf(items),
			degree,
			timeStamp,
		};
	},

	setLocalMatrix(item: ItemOrId, matrix: MatrixData): TransformationOperation {
		return {
			class: "Transformation",
			method: "setLocalMatrix",
			item: idsOf(item),
			matrix,
		} as any;
	},

	scaleByTranslateBy(items: readonly ItemOrId[] | ItemOrId, scale: { x: number; y: number }, translate: { x: number; y: number }, timeStamp?: number): TransformationOperation {
		return this.applyMatrix(items, {
			translateX: translate.x,
			translateY: translate.y,
			scaleX: scale.x,
			scaleY: scale.y,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	},

	setLocal(item: ItemOrId, data: Partial<MatrixData>): TransformationOperation {
		return {
			class: "Transformation",
			method: "setLocal",
			item: idsOf(item),
			data,
		} as any;
	},

	lock(items: readonly ItemOrId[] | ItemOrId, locked: boolean): TransformationOperation {
		return {
			class: "Transformation",
			method: locked ? "locked" : "unlocked",
			item: idsOf(items),
			locked,
		} as TransformationOperation;
	},

	move(items: MoveOperation["items"], timeStamp?: number): TransformationOperation {
		return {
			class: "Transformation",
			method: "move",
			items,
			timeStamp,
		};
	},

	setPlacement(items: SetPlacementOperation["items"], timeStamp?: number): TransformationOperation {
		return {
			class: "Transformation",
			method: "setPlacement",
			items,
			timeStamp,
		};
	},
};
