import { TransformationOperation, MoveOperation, SetPlacementOperation } from 'Geometry/Transformation/TransformationOperations';

export function transformTransformationOperation(
	confirmed: TransformationOperation,
	toTransform: TransformationOperation
): TransformationOperation | undefined {
	if (confirmed.method === "move" && toTransform.method === "move") {
		return transformMove_Move(confirmed, toTransform);
	}
	if (confirmed.method === "setPlacement" && toTransform.method === "setPlacement") {
		return transformSetPlacement_SetPlacement(confirmed, toTransform);
	}
	if (confirmed.method === "setPlacement" && toTransform.method === "move") {
		return transformSetPlacement_Move(confirmed, toTransform);
	}
	if (confirmed.method === "move" && toTransform.method === "setPlacement") {
		return transformMove_SetPlacement(confirmed, toTransform);
	}
	return toTransform;
}

function transformMove_Move(
	confirmed: MoveOperation,
	toTransform: MoveOperation
): MoveOperation {
	const transformed = { ...toTransform, items: [...toTransform.items] };
	for (let i = 0; i < transformed.items.length; i++) {
		const toT = transformed.items[i];
		const conf = confirmed.items.find(item => item.id === toT.id);
		if (conf) {
			// Same item moved concurrently. 
			// Update prevWorldMatrix to reflect the state after confirmed move.
			transformed.items[i] = {
				...toT,
				prevWorldMatrix: conf.worldMatrix,
			};
		}
	}
	return transformed;
}

function transformSetPlacement_SetPlacement(
	confirmed: SetPlacementOperation,
	toTransform: SetPlacementOperation
): SetPlacementOperation {
	const transformed = { ...toTransform, items: [...toTransform.items] };
	for (let i = 0; i < transformed.items.length; i++) {
		const toT = transformed.items[i];
		const conf = confirmed.items.find(item => item.id === toT.id);
		if (conf) {
			// Concurrent reparenting of same item.
			// Update prev state to reflect confirmed placement.
			transformed.items[i] = {
				...toT,
				prevParentId: conf.parentId,
				prevWorldMatrix: conf.worldMatrix,
			};
		}
		
		// Z-index rebasing if in same parent
		// (Simplified: last writer wins for absolute z-index, 
		// but confirmed might have shifted sibling list).
		// TODO: Implement sibling index rebasing if needed for relative ordering.
	}
	return transformed;
}

function transformSetPlacement_Move(
	confirmed: SetPlacementOperation,
	toTransform: MoveOperation
): SetPlacementOperation {
	// If confirmed re-parented an item that toTransform is moving,
	// promote Move to SetPlacement to maintain the new parent.
	const items: any[] = toTransform.items.map(toT => {
		const conf = confirmed.items.find(item => item.id === toT.id);
		if (conf) {
			return {
				id: toT.id,
				parentId: conf.parentId,
				zOrderIndex: 0, 
				worldMatrix: toT.worldMatrix,
				prevParentId: conf.parentId,
				prevWorldMatrix: conf.worldMatrix,
			};
		}
		return {
			...toT,
			// Move doesn't have parentId, so it keeps current (which is unknown here without board)
			// This is a limitation of pure-op OT. 
		};
	});

	return {
		class: "Transformation",
		method: "setPlacement",
		items,
		timeStamp: toTransform.timeStamp,
	} as SetPlacementOperation;
}

function transformMove_SetPlacement(
	confirmed: MoveOperation,
	toTransform: SetPlacementOperation
): SetPlacementOperation {
	const transformed = { ...toTransform, items: [...toTransform.items] };
	for (let i = 0; i < transformed.items.length; i++) {
		const toT = transformed.items[i];
		const conf = confirmed.items.find(item => item.id === toT.id);
		if (conf) {
			transformed.items[i] = {
				...toT,
				prevWorldMatrix: conf.worldMatrix,
			};
		}
	}
	return transformed;
}
