import { getContainersSortedByZIndex } from "./getContainersSortedByZIndex";

test("getContainersSortedByZIndex", () => {
	const containers = [
		{ id: 1, zIndex: 2 },
		{ id: 2, zIndex: 3 },
		{ id: 3, zIndex: 1 },
		{ id: 4, zIndex: 4 },
	];
	const sorted = getContainersSortedByZIndex(containers);
	expect(
		"" +
			sorted[0].zIndex +
			sorted[1].zIndex +
			sorted[2].zIndex +
			sorted[3].zIndex,
	).toBe("1234");
});
