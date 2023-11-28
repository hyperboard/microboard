/*
import { RTreeIndex } from "../RTreeIndex";
import { LayeredIndex } from ".";
import { Mbr, Shape } from "Board/Items/";

describe("LayeredItemsIndex", () => {
	const getZIndex = (id: string): number => {
		const zIndexes: { [id: string]: number } = {
			a: 1,
			b: 2,
			c: 3,
			d: 4,
		};
		return zIndexes[id];
	};
	const index = new LayeredIndex(getZIndex);
	const aData = {
		id: "a",
		item: new Shape(),
		...transformedItem.getBounds(),
	};
	const bData = {
		id: "b",
		item: new Shape(),
		...transformedItem.getBounds(),
	};
	const cData = {
		id: "c",
		item: new Shape(),
		data: {},
		...transformedItem.getBounds(),
	};
	const dData = {
		id: "d",
		item: new Shape(),
		data: {},
		...transformedItem.getBounds(),
	};
	index.insert("b", bData);
	index.insert("c", cData);
	index.insert("a", aData);
	index.insert("d", dData);
	it("inserts and gets items", () => {
		expect(index.get("a")).toEqual(aData);
	});
	it("finds items in bounds in correct order", () => {
		const items = index.getEnc{
			left: 0,
			top: 0,
			right: 50,
			bottom: 50,
		});
		expect(items[0].id + items[1].id + items[2].id + items[3].id).toBe(
			"abcd",
		);
	});
	const figure4 = {
		fillColor: "rgba(211,123,222,1)",
		id: "18454acd-73e3-408f-a589-097563a31790",
		olderSibling: "2507a8db-00b3-4999-81a1-72c32324c627",
		oldestChild: undefined,
		parent: "root",
		position: {
			x: 646,
			y: 15,
		},
		scale: {
			x: 3.35,
			y: 1.75,
		},
		strokeColor: "rgba(85,4,88,1)",
		strokeType: "",
		strokeWidth: 2.960223456004692,
		type: "ArrowLeft",
		youngerSibling: "80f7da25-874c-41f0-87af-5e0605c61d78",
	};

	const figure3 = {
		fillColor: "rgba(110,196,203,1)",
		id: "2507a8db-00b3-4999-81a1-72c32324c627",
		olderSibling: "5c0135d2-4ee4-411f-a824-5f6a40ebff90",
		oldestChild: undefined,
		parent: "root",
		position: {
			x: 940,
			y: 48,
		},
		scale: {
			x: 5.54,
			y: 2.12,
		},
		strokeColor: "rgba(46,32,58,1)",
		strokeType: "",
		strokeWidth: 2.5851707983500134,
		type: "Rectangle",
		youngerSibling: "18454acd-73e3-408f-a589-097563a31790",
	};

	const figure2 = {
		fillColor: "rgba(194,216,159,1)",
		id: "5c0135d2-4ee4-411f-a824-5f6a40ebff90",
		olderSibling: "03d2c025-a51f-4afb-85f3-69fd121e8f74",
		oldestChild: undefined,
		parent: "root",
		position: {
			x: 363,
			y: 140,
		},
		scale: {
			x: 3.66,
			y: 1.31,
		},
		strokeColor: "rgba(29,48,76,1)",
		strokeType: "",
		strokeWidth: 1.0960486000811216,
		type: "Rectangle",
		youngerSibling: "2507a8db-00b3-4999-81a1-72c32324c627",
	};

	const figure1 = {
		fillColor: "rgba(138,212,109,1)",
		id: "03d2c025-a51f-4afb-85f3-69fd121e8f74",
		olderSibling: "ed2141df-bcbd-49cc-8cff-b6b4ad691b0d",
		oldestChild: undefined,
		parent: "root",
		position: {
			x: 180,
			y: 117,
		},
		scale: {
			x: 2.82,
			y: 1.87,
		},
		strokeColor: "rgba(71,3,12,1)",
		strokeType: "",
		strokeWidth: 1.8167401571014716,
		type: "Rectangle",
		youngerSibling: "5c0135d2-4ee4-411f-a824-5f6a40ebff90",
	};

	const figure0 = {
		fillColor: "rgba(129,171,135,1)",
		id: "ed2141df-bcbd-49cc-8cff-b6b4ad691b0d",
		olderSibling: undefined,
		oldestChild: undefined,
		parent: "root",
		position: {
			x: 238,
			y: 11,
		},
		scale: {
			x: 3.66,
			y: 3.22,
		},
		strokeColor: "rgba(35,71,17,1)",
		strokeType: "",
		strokeWidth: 1.1345639760684456,
		type: "ArrowLeft",
		youngerSibling: "03d2c025-a51f-4afb-85f3-69fd121e8f74",
	};
	const item0 = getItemFromFigure(figure0 as unknown as Shape);
	const item1 = getItemFromFigure(figure1 as unknown as Shape);
	const item2 = getItemFromFigure(figure2 as unknown as Shape);
	const item3 = getItemFromFigure(figure3 as unknown as Shape);
	const item4 = getItemFromFigure(figure4 as unknown as Shape);
	const getZIndex2 = (id: string): number => {
		const zIndexes: { [id: string]: number } = {};
		zIndexes[figure0.id] = 1;
		zIndexes[figure1.id] = 2;
		zIndexes[figure2.id] = 3;
		zIndexes[figure3.id] = 4;
		zIndexes[figure4.id] = 5;
		return zIndexes[id];
	};
	const data0 = {
		id: figure0.id,
		data: figure0,
		item: item0,
		...item0.getBounds(),
	};
	const data1 = {
		id: figure1.id,
		data: figure1,
		item: item1,
		...item1.getBounds(),
	};
	const data2 = {
		id: figure2.id,
		data: figure2,
		item: item2,
		...item2.getBounds(),
	};
	const data3 = {
		id: figure3.id,
		data: figure3,
		item: item3,
		...item3.getBounds(),
	};
	const data4 = {
		id: figure4.id,
		data: figure4,
		item: item4,
		...item4.getBounds(),
	};
	const index2 = new LayeredIndex<GenericIndexItem>(getNewLayer, getZIndex2);
	index2.insert(data0.id, data0);
	index2.insert(data1.id, data1);
	index2.insert(data2.id, data2);
	index2.insert(data3.id, data3);
	index2.insert(data4.id, data4);
	it("finds items in bounds in correct order", () => {
		const items = index2.getAllInBoundsByPoint({
			left: 0,
			top: 0,
			right: 2000,
			bottom: 1000,
		});
		expect(items[4].id).toBe(figure4.id);
	});
});

test("Layered items index layers moved items", () => {
	const getNewLayer = (): RTreeIndex<GenericIndexItem> => {
		return new RTreeIndex();
	};
	const getZIndex = (id: string): number => {
		const zIndexes: { [id: string]: number } = {
			a: 1,
			b: 5,
			c: 3,
			d: 4,
			e: 2,
		};
		return zIndexes[id];
	};
	const index = new LayeredIndex<GenericIndexItem>(getNewLayer, getZIndex);
	const roundedRectangle = new ClosedPath(getPathItems(RoundedRectangle));
	const itemA = new TransformedItem(
		{ position: { x: 0, y: 0 }, scale: { x: 1, y: 1 } },
		roundedRectangle,
	);
	const itemB = new TransformedItem(
		{ position: { x: 150, y: 75 }, scale: { x: 1, y: 1 } },
		roundedRectangle,
	);
	const itemC = new TransformedItem(
		{ position: { x: 0, y: 150 }, scale: { x: 1, y: 1 } },
		roundedRectangle,
	);
	const itemD = new TransformedItem(
		{ position: { x: 0, y: 230 }, scale: { x: 1, y: 1 } },
		roundedRectangle,
	);
	const itemE = new TransformedItem(
		{ position: { x: 0, y: 240 }, scale: { x: 1, y: 1 } },
		roundedRectangle,
	);
	const itemBMoved = new TransformedItem(
		{ position: { x: 0, y: 75 }, scale: { x: 1, y: 1 } },
		roundedRectangle,
	);
	const aData = {
		id: "a",
		item: itemA,
		data: {},
		...itemA.getBounds(),
	};
	const bData = {
		id: "b",
		item: itemB,
		data: {},
		...itemB.getBounds(),
	};
	const cData = {
		id: "c",
		item: itemC,
		data: {},
		...itemC.getBounds(),
	};
	const dData = {
		id: "d",
		item: itemD,
		data: {},
		...itemD.getBounds(),
	};
	const eData = {
		id: "e",
		item: itemE,
		data: {},
		...itemE.getBounds(),
	};
	const bDataMoved = {
		id: "b",
		item: itemBMoved,
		data: {},
		...itemBMoved.getBounds(),
	};
	index.insert("a", aData);
	index.insert("b", bData);
	index.insert("c", cData);
	index.insert("d", dData);
	index.insert("e", eData);
	index.change("b", bDataMoved);
	index.change("b", bDataMoved);
	const items = index.get(new Mbr(0, 0, 1000, 1000))
	expect(items.length).toBe(5);
	expect(items[0].id).toBe("a");
	expect(items[1].id).toBe("b");
	expect(items[2].id).toBe("c");
	expect(items[3].id).toBe("d");
	expect(items[4].id).toBe("e");
});
*/
