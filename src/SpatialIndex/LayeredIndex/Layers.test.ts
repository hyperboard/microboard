import { Layers } from "./Layers";

describe("Layers", () => {
	let layerIndex = 0;

	function getNewLayer(): number {
		const layer = layerIndex;
		layerIndex++;
		return layer;
	}

	const layers = new Layers<number>(getNewLayer);
	layers.newOnTop(); // 1
	layers.newOnTop(); // 2
	layers.newOnBottom(); // 3
	layers.newOnBottom(); // 4

	it("adds new layers and iterates over them", () => {
		expect(layers.get(0)).toBe(0);
		expect(layers.get(1)).toBe(1);
		expect(layers.get(-1)).toBe(3);
		expect(layers.get(layers.getTop())).toBe(2);
		expect(layers.get(layers.getBottom())).toBe(4);
		let values = "";
		for (const layer of layers) {
			values += layer;
		}
		expect(values).toBe("43012");
		for (const layer of layers) {
			values += layer;
		}
		expect(values).toBe("4301243012");
		values = "";
		for (const layer of layers) {
			values += layer;
			values += ",";
			for (const layer of layers) {
				values += layer;
			}
			values += ",";
		}
		expect(values).toBe("4,43012,3,43012,0,43012,1,43012,2,43012,");
	});
});
