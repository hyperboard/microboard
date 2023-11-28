import { getContainersSortedByZIndex } from "./getContainersSortedByZIndex";

export function getContainersToSet<
	Container extends { layer: number; zIndex: number },
>(toAdd: Container, toChange: Container[]): Container[] {
	if (toChange.length === 0) {
		return [toAdd];
	}
	const containers = toChange.concat([toAdd]);
	const total = containers.length;
	const sorted = getContainersSortedByZIndex(containers);
	const index = sorted.findIndex(container => {
		return container === toAdd;
	});
	const above = total - (index + 1);
	const below = total - (above + 1);
	const containersAbove = containers.slice(index + 1, containers.length);
	const containersBelow = containers.slice(0, index);
	let topLayer = -Number.MAX_VALUE;
	for (const container of containers) {
		if (topLayer < container.layer) {
			topLayer = container.layer;
		}
	}
	let bottomLayer = Number.MAX_VALUE;
	for (const container of containers) {
		if (bottomLayer > container.layer) {
			bottomLayer = container.layer;
		}
	}
	let result = containers;
	if (above === 0) {
		toAdd.layer = topLayer + 1;
		result = [toAdd];
	} else if (below === 0) {
		toAdd.layer = bottomLayer - 1;
		result = [toAdd];
	} else if (above > below) {
		toAdd.layer = containers[index - 1].layer + 1;
		let layerAbove = toAdd.layer;
		for (const container of containersBelow) {
			if (container.layer >= layerAbove) {
				container.layer--;
				layerAbove = container.layer;
			}
		}
		result = containersBelow.concat([toAdd]);
	} else {
		toAdd.layer = containers[index - 1].layer + 1;
		let layerBelow = toAdd.layer;
		for (const container of containersAbove) {
			if (container.layer <= layerBelow) {
				container.layer += 2;
				layerBelow = container.layer;
			}
		}
		result = [toAdd].concat(containersAbove);
	}
	return result;
}

export function isTwoOnSameLayer<
	Container extends { layer: number; zIndex: number },
>(containers: Container[]): boolean {
	for (const aContainer of containers) {
		for (const bContainer of containers) {
			if (aContainer.layer === bContainer.layer) {
				return true;
			}
		}
	}
	return false;
}
