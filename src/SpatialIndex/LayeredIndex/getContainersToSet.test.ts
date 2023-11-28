import { getContainersToSet } from "./getContainersToSet";

interface Container {
	zIndex: number;
	layer: number;
}

test("getContainersToSet", () => {
	function checkZIndexes(containers: Container[], expected: string): void {
		let zs = "";
		for (const container of containers) {
			zs += container.zIndex;
		}
		expect(zs).toBe(expected);
	}

	function checkLayers(containers: Container[]): void {
		let layer = -Number.MAX_VALUE;
		for (const container of containers) {
			expect(container.layer).toBeGreaterThan(layer);
			layer = container.layer;
		}
	}

	let containers = getContainersToSet({ zIndex: 1, layer: 0 }, []);
	checkZIndexes(containers, "1");
	checkLayers(containers);
	containers = getContainersToSet({ zIndex: 5, layer: 0 }, [
		{ zIndex: 1, layer: -2 },
		{ zIndex: 2, layer: -1 },
		{ zIndex: 3, layer: 0 },
		{ zIndex: 6, layer: 1 },
	]);
	checkZIndexes(containers, "56");
	checkLayers(containers);
	containers = getContainersToSet({ zIndex: 1, layer: 0 }, [
		{ zIndex: 2, layer: -2 },
		{ zIndex: 3, layer: -1 },
		{ zIndex: 8, layer: 0 },
		{ zIndex: 6, layer: 1 },
	]);
	checkZIndexes(containers, "1");
	expect(containers[0].layer).toBe(-3);
	checkLayers(containers);
});
