interface HasZIndex {
	zIndex: number;
}

export function getContainersSortedByZIndex<Container extends HasZIndex>(
	containers: Container[],
): Container[] {
	return containers.sort((containerA, containerB) => {
		return containerA.zIndex - containerB.zIndex;
	});
}
