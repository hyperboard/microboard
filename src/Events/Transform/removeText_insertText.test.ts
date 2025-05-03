import { RemoveTextOperation, InsertTextOperation } from "slate";
import { removeText_insertText } from "./removeText_insertText";

describe("removeText_insertText", () => {
	test("transforms insert when remove is at the same position", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 5,
			text: "hello",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 5,
			text: "world",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(0);
		expect(result.text).toBe("world");
		expect(result.path).toEqual([0, 0]);
	});

	test("transforms insert when remove is before insert", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 2,
			text: "abc",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 7,
			text: "xyz",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(4); // 7 - 3 = 4
		expect(result.text).toBe("xyz");
		expect(result.path).toEqual([0, 0]);
	});

	test("does not transform insert when remove is after insert", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 10,
			text: "def",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 5,
			text: "ghi",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(5); // Unchanged
		expect(result.text).toBe("ghi");
		expect(result.path).toEqual([0, 0]);
	});

	test("does not transform insert when paths are different", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 5,
			text: "hello",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 1],
			offset: 5,
			text: "world",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(5); // Unchanged
		expect(result.text).toBe("world");
		expect(result.path).toEqual([0, 1]);
	});

	test("transforms insert when remove is immediately before insert", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 5,
			text: "hello",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 10,
			text: "world",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(5); // 10 - 5 = 5
		expect(result.text).toBe("world");
		expect(result.path).toEqual([0, 0]);
	});

	test("handles removal of a single character before insert", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 3,
			text: "a",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 4,
			text: "b",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(3);
		expect(result.text).toBe("b");
		expect(result.path).toEqual([0, 0]);
	});

	test("handles removal of long text before insert", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 3],
			offset: 0,
			text: "This is a very long string to be removed",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2, 3],
			offset: 45,
			text: "new text",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(5); // 45 - 40 = 5
		expect(result.text).toBe("new text");
		expect(result.path).toEqual([1, 2, 3]);
	});

	test("transforms insert when remove is at offset 0", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 0,
			text: "prefix",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 10,
			text: "suffix",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(4); // 10 - 6 = 4
		expect(result.text).toBe("suffix");
		expect(result.path).toEqual([0, 0]);
	});

	test("transforms insert at the exact boundary case", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [0, 0],
			offset: 5,
			text: "text",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [0, 0],
			offset: 9,
			text: "new",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(5); // 9 - 4 = 5
		expect(result.text).toBe("new");
		expect(result.path).toEqual([0, 0]);
	});

	test("handles deep nested paths correctly", () => {
		// Arrange
		const remove: RemoveTextOperation = {
			type: "remove_text",
			path: [1, 2, 3, 4, 5],
			offset: 3,
			text: "abc",
		};
		const insert: InsertTextOperation = {
			type: "insert_text",
			path: [1, 2, 3, 4, 5],
			offset: 6,
			text: "xyz",
		};

		// Act
		const result = removeText_insertText(remove, insert);

		// Assert
		expect(result.offset).toBe(3); // 6 - 3 = 3
		expect(result.text).toBe("xyz");
		expect(result.path).toEqual([1, 2, 3, 4, 5]);
	});
});
