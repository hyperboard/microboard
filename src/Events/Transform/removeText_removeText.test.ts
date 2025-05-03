import { RemoveTextOperation } from "slate";
import { removeText_removeText } from "./removeText_removeText";

describe("removeText_removeText transformation", () => {
	it("should reduce text length when confirmed operation is at the start of the to-transform text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "1",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "23",
		});
	});

	it("should adjust offset and trim text when confirmed operation is in the middle of to-transform text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 1,
			text: "23",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "1",
		});
	});

	it("should not modify to-transform operation when operations are on different paths", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "test",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle complete text removal when confirmed operation covers entire to-transform text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "",
		});
	});

	it("should handle removal at the end of existing text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "3",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "12",
		});
	});
	it("should handle confirmed operation after to-transform operation", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 3,
			text: "456",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "123",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle overlapping removals with longer confirmed text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 1,
			text: "234",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "12345",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "15",
		});
	});

	it("should handle removals with unicode characters", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "😀",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "😀world",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "world",
		});
	});

	it("should handle removals with mixed character types", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 1,
			text: "e",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hello",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hllo",
		});
	});

	it("should handle zero-length text removal", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hello",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle removal at exact boundary points", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 3,
			text: "lo",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hello",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "hel",
		});
	});

	it("should handle extreme case with very long text", () => {
		const longText = "a".repeat(10000);
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 5000,
			text: "a".repeat(1000),
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: longText,
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: longText.slice(0, 5000) + longText.slice(6000),
		});
	});

	it("should handle removal of text with special characters", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "@#$",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "@#$%^&*",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "%^&*",
		});
	});

	it("should maintain original operation when confirmed is completely outside text range", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 10,
			text: "xyz",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "abc",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual(toTransform);
	});

	it("should handle partial overlap with confirmed operation starting mid-text", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "345",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "12345678",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "12678",
		});
	});

	it("should handle nested transformations with multiple character types", () => {
		const confirmed: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 2,
			text: "ou",
		};

		const toTransform: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "about",
		};

		const result = removeText_removeText(confirmed, toTransform);

		expect(result).toEqual({
			type: "remove_text",
			path: [1, 0],
			offset: 0,
			text: "abt",
		});
	});
});
