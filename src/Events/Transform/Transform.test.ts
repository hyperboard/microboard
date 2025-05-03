import { RichTextOperation } from "Board/Items/RichText/RichTextOperations";
import { transformRichTextOperation } from "./Transform";

describe("transformRichTextOperation", () => {
	describe("groupEdit - groupEdit transformation", () => {
		it("should transform operations for the same item", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 0,
								text: "hello ",
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 0,
								text: "world",
							},
						],
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 6,
				text: "world",
			});
		});
	});
	it("should handle multiple item operations", () => {
		const confirmed: RichTextOperation = {
			class: "RichText",
			method: "groupEdit",
			itemsOps: [
				{
					item: "item1",
					selection: null,
					ops: [
						{
							type: "insert_text",
							path: [0],
							offset: 0,
							text: "hello ",
						},
					],
				},
				{
					item: "item2",
					selection: null,
					ops: [
						{
							type: "remove_text",
							path: [0],
							offset: 3,
							text: "test",
						},
					],
				},
			],
		};

		const toTransform: RichTextOperation = {
			class: "RichText",
			method: "groupEdit",
			itemsOps: [
				{
					item: "item1",
					selection: null,
					ops: [
						{
							type: "insert_text",
							path: [0],
							offset: 0,
							text: "world",
						},
					],
				},
				{
					item: "item2",
					selection: null,
					ops: [
						{
							type: "insert_text",
							path: [0],
							offset: 2,
							text: "new",
						},
					],
				},
			],
		};

		const result = transformRichTextOperation(confirmed, toTransform);

		expect(result).toBeDefined();
		expect(result?.itemsOps[0].ops[0]).toEqual({
			type: "insert_text",
			path: [0],
			offset: 6,
			text: "world",
		});
		expect(result?.itemsOps[1].ops[0]).toEqual({
			type: "insert_text",
			path: [0],
			offset: 2,
			text: "new",
		});
	});
	describe("groupEdit - edit transformation", () => {
		it("should transform edit operation within group edit", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 0,
								text: "hello ",
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "insert_text",
						path: [0],
						offset: 0,
						text: "world",
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 6,
				text: "world",
			});
		});

		it("should handle edit operation for different items in group edit", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 5,
								text: "hello",
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item2"],
				ops: [
					{
						type: "insert_text",
						path: [0],
						offset: 3,
						text: "world",
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 3,
				text: "world",
			});
		});
	});
	describe("Complex Transformation Scenarios", () => {
		it("should handle multiple nested transformations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 0,
								text: "hello ",
							},
							{
								type: "remove_text",
								path: [0],
								offset: 10,
								text: "world",
							},
						],
					},
					{
						item: "item2",
						selection: null,
						ops: [
							{
								type: "insert_node",
								path: [1],
								node: { type: "paragraph" },
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 0,
								text: "world",
							},
							{
								type: "set_node",
								path: [0],
								newProperties: { bold: true },
							},
						],
					},
					{
						item: "item2",
						selection: null,
						ops: [
							{
								type: "remove_node",
								path: [1],
								node: { type: "paragraph" },
							},
						],
					},
				],
			};
			const result = transformRichTextOperation(confirmed, toTransform);
			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 6,
				text: "world",
			});
			expect(result?.itemsOps[0].ops[1]).toEqual({
				type: "set_node",
				path: [0],
				newProperties: { bold: true },
			});
			expect(result?.itemsOps[1].ops[0]).toEqual({
				type: "remove_node",
				path: [2],
				node: { type: "paragraph" },
			});
		});

		it("should handle conflicting font style operations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "set_node",
						path: [0],
						properties: {},
						newProperties: { bold: true },
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "set_node",
						path: [0],
						properties: {},
						newProperties: { italic: true },
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "set_node",
				path: [0],
				properties: {
					bold: true,
				},
				newProperties: {
					bold: true,
					italic: true,
				},
			});
		});
	});
});
/*


	// Mocking complex scenarios that might require more sophisticated transformation
	describe("Advanced Transformation Scenarios", () => {
		it("should handle text insertion with multiple concurrent edits", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 5,
								text: "first",
							},
							{
								type: "insert_text",
								path: [0],
								offset: 10,
								text: "second",
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 3,
								text: "start",
							},
							{
								type: "remove_text",
								path: [0],
								offset: 8,
								text: "original",
							},
						],
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 11, // 3 + length of first operation's inserted text
				text: "start",
			});
			expect(result?.itemsOps[0].ops[1]).toEqual({
				type: "remove_text",
				path: [0],
				offset: 8,
				text: "original",
			});
		});

		it("should handle complex nested transformations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "split_node",
						path: [0],
						position: 5,
						properties: { type: "paragraph" },
					},
					{
						type: "insert_node",
						path: [1],
						node: { type: "heading" },
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "set_node",
						path: [0],
						newProperties: { align: "center" },
					},
					{
						type: "remove_node",
						path: [1],
						node: { type: "heading" },
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "set_node",
				path: [0],
				newProperties: { align: "center" },
			});
			expect(result?.ops[1]).toEqual({
				type: "remove_node",
				path: [1],
				node: { type: "heading" },
			});
		});
	});

	describe("Performance and Edge Case Handling", () => {
		it("should handle a large number of concurrent operations", () => {
			const generateOperations = (count: number) => {
				return Array.from({ length: count }, (_, i) => ({
					type: "insert_text",
					path: [0],
					offset: i * 2,
					text: `text${i}`,
				}));
			};

			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: generateOperations(50),
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: generateOperations(50),
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops.length).toBe(50);

			// Verify that offsets are correctly transformed
			result?.itemsOps[0].ops.forEach((op, index) => {
				expect(op.type).toBe("insert_text");
				expect(op.offset).toBe(index * 2 + index * 6); // Original offset + cumulative text length
			});
		});

		it("should handle operations with different path depths", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "insert_node",
						path: [0, 1],
						node: { type: "paragraph" },
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "insert_node",
						path: [0],
						node: { type: "list" },
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "insert_node",
				path: [0],
				node: { type: "list" },
			});
			expect(result?.ops[1]).toEqual({
				type: "insert_node",
				path: [1, 1], // Path adjusted for new node insertion
				node: { type: "paragraph" },
			});
		});
	});

	describe("Conflict Resolution", () => {
		it("should merge conflicting style operations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "set_node",
						path: [0],
						newProperties: {
							bold: true,
							color: "red",
						},
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "set_node",
						path: [0],
						newProperties: {
							italic: true,
							fontSize: 16,
						},
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "set_node",
				path: [0],
				newProperties: {
					bold: true,
					color: "red",
					italic: true,
					fontSize: 16,
				},
			});
		});

		it("should handle complex node transformation conflicts", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "split_node",
								path: [0],
								position: 5,
								properties: { type: "paragraph" },
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "merge_node",
								path: [1],
								position: 3,
							},
						],
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops[0]).toEqual({
				type: "merge_node",
				path: [1],
				position: 3,
			});
		});

		it("should handle cross-item transformations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 5,
								text: "first",
							},
						],
					},
					{
						item: "item2",
						selection: null,
						ops: [
							{
								type: "insert_node",
								path: [0],
								node: { type: "paragraph" },
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 3,
								text: "start",
							},
						],
					},
					{
						item: "item3",
						selection: null,
						ops: [
							{
								type: "remove_node",
								path: [0],
								node: { type: "heading" },
							},
						],
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 8, // 3 + length of 'first'
				text: "start",
			});
			expect(result?.itemsOps[1].ops[0]).toEqual({
				type: "insert_node",
				path: [0],
				node: { type: "paragraph" },
			});
			expect(result?.itemsOps[2].ops[0]).toEqual({
				type: "remove_node",
				path: [0],
				node: { type: "heading" },
			});
		});
	});

	describe("Transformation Type Consistency", () => {
		it("should maintain operation type consistency", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "insert_text",
						path: [0],
						offset: 5,
						text: "original",
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "remove_text",
						path: [0],
						offset: 3,
						text: "test",
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0].type).toBe("remove_text");
			expect(result?.ops[1].type).toBe("insert_text");
		});
	});

	// Final catch-all test for unexpected scenarios
	describe("Unexpected Scenarios", () => {
		it("should handle completely unrelated operations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item1"],
				ops: [
					{
						type: "insert_text",
						path: [0],
						offset: 5,
						text: "original",
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "edit",
				item: ["item2"],
				ops: [
					{
						type: "remove_node",
						path: [1],
						node: { type: "paragraph" },
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.ops[0]).toEqual({
				type: "remove_node",
				path: [1],
				node: { type: "paragraph" },
			});
		});
	});

	// Type-specific transformation tests
	describe("Specific Operation Type Transformations", () => {
		describe("Text Insertion Transformations", () => {
			it("should correctly transform text insertions", () => {
				const confirmed: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_text",
							path: [0],
							offset: 5,
							text: "hello",
						},
					],
				};

				const toTransform: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_text",
							path: [0],
							offset: 3,
							text: "world",
						},
					],
				};

				const result = transformRichTextOperation(
					confirmed,
					toTransform,
				);

				expect(result).toBeDefined();
				expect(result?.ops[0]).toEqual({
					type: "insert_text",
					path: [0],
					offset: 8, // 3 + length of 'hello'
					text: "world",
				});
			});

			it("should handle text insertions at different path levels", () => {
				const confirmed: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_text",
							path: [0, 1],
							offset: 5,
							text: "nested",
						},
					],
				};

				const toTransform: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_text",
							path: [0],
							offset: 3,
							text: "top-level",
						},
					],
				};

				const result = transformRichTextOperation(
					confirmed,
					toTransform,
				);

				expect(result).toBeDefined();
				expect(result?.ops[0]).toEqual({
					type: "insert_text",
					path: [0],
					offset: 3,
					text: "top-level",
				});
				expect(result?.ops[1]).toEqual({
					type: "insert_text",
					path: [0, 1],
					offset: 5,
					text: "nested",
				});
			});
		});

		describe("Node Manipulation Transformations", () => {
			it("should handle node insertions", () => {
				const confirmed: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_node",
							path: [0],
							node: { type: "paragraph" },
						},
					],
				};

				const toTransform: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "set_node",
							path: [1],
							newProperties: { align: "center" },
						},
					],
				};

				const result = transformRichTextOperation(
					confirmed,
					toTransform,
				);

				expect(result).toBeDefined();
				expect(result?.ops[0]).toEqual({
					type: "insert_node",
					path: [0],
					node: { type: "paragraph" },
				});
				expect(result?.ops[1]).toEqual({
					type: "set_node",
					path: [2], // Path adjusted for new node insertion
					newProperties: { align: "center" },
				});
			});

			it("should handle node removals", () => {
				const confirmed: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "remove_node",
							path: [1],
							node: { type: "paragraph" },
						},
					],
				};

				const toTransform: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_node",
							path: [0],
							node: { type: "heading" },
						},
					],
				};

				const result = transformRichTextOperation(
					confirmed,
					toTransform,
				);

				expect(result).toBeDefined();
				expect(result?.ops[0]).toEqual({
					type: "insert_node",
					path: [0],
					node: { type: "heading" },
				});
				expect(result?.ops[1]).toEqual({
					type: "remove_node",
					path: [2], // Path adjusted for new node insertion
					node: { type: "paragraph" },
				});
			});

			it("should handle node splitting", () => {
				const confirmed: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "split_node",
							path: [0],
							position: 5,
							properties: { type: "paragraph" },
						},
					],
				};

				const toTransform: RichTextOperation = {
					class: "RichText",
					method: "edit",
					item: ["item1"],
					ops: [
						{
							type: "insert_node",
							path: [0],
							node: { type: "list" },
						},
					],
				};

				const result = transformRichTextOperation(
					confirmed,
					toTransform,
				);

				expect(result).toBeDefined();
				expect(result?.ops[0]).toEqual({
					type: "insert_node",
					path: [0],
					node: { type: "list" },
				});
				expect(result?.ops[1]).toEqual({
					type: "split_node",
					path: [1], // Path adjusted for new node insertion
					position: 5,
					properties: { type: "paragraph" },
				});
			});
		});
	});

	// Final comprehensive test suite
	describe("Comprehensive Transformation Scenarios", () => {
		it("should handle a complex sequence of operations", () => {
			const confirmed: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 5,
								text: "hello",
							},
							{
								type: "set_node",
								path: [0],
								newProperties: { bold: true },
							},
							{
								type: "split_node",
								path: [0],
								position: 10,
								properties: { type: "paragraph" },
							},
						],
					},
					{
						item: "item2",
						selection: null,
						ops: [
							{
								type: "insert_node",
								path: [0],
								node: { type: "list" },
							},
						],
					},
				],
			};

			const toTransform: RichTextOperation = {
				class: "RichText",
				method: "groupEdit",
				itemsOps: [
					{
						item: "item1",
						selection: null,
						ops: [
							{
								type: "insert_text",
								path: [0],
								offset: 3,
								text: "world",
							},
							{
								type: "set_node",
								path: [0],
								newProperties: { italic: true },
							},
							{
								type: "remove_node",
								path: [1],
								node: { type: "paragraph" },
							},
						],
					},
					{
						item: "item3",
						selection: null,
						ops: [
							{
								type: "remove_text",
								path: [0],
								offset: 2,
								text: "test",
							},
						],
					},
				],
			};

			const result = transformRichTextOperation(confirmed, toTransform);

			expect(result).toBeDefined();
			expect(result?.itemsOps[0].ops[0]).toEqual({
				type: "insert_text",
				path: [0],
				offset: 8, // 3 + length of 'hello'
				text: "world",
			});
			expect(result?.itemsOps[0].ops[1]).toEqual({
				type: "set_node",
				path: [0],
				newProperties: {
					bold: true,
					italic: true,
				},
			});
			expect(result?.itemsOps[0].ops[2]).toEqual({
				type: "split_node",
				path: [1], // Path adjusted for new node insertion
				position: 10,
				properties: { type: "paragraph" },
			});
			expect(result?.itemsOps[1].ops[0]).toEqual({
				type: "insert_node",
				path: [0],
				node: { type: "list" },
			});
			expect(result?.itemsOps[2].ops[0]).toEqual({
				type: "remove_text",
				path: [0],
				offset: 2,
				text: "test",
			});
		});
	});
});
*/
