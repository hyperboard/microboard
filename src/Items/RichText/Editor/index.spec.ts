import { assert } from "chai";
import { createEditor } from "slate";
import { withHistory } from "slate-history";
import { withReact } from "slate-react";

describe("User can edit a text", () => {
	it("user can write a word", () => {
		const editor = withReact(withHistory(createEditor()));
		editor.children = [
			{
				type: "paragraph",
				children: [
					{
						type: "text",
						text: "",
					},
				],
			},
		];
		editor.apply({
			newProperties: {
				anchor: {
					offset: 0,
					path: [0, 0],
				},
				focus: {
					offset: 0,
					path: [0, 0],
				},
			},
			properties: null,
			type: "set_selection",
		});
		editor.apply({
			offset: 0,
			path: [0, 0],
			text: "h",
			type: "insert_text",
		});
		const block = editor.children[0];
		if (block.type === "paragraph") {
			const text = block.children[0];
			assert.equal(text.text, "h");
		}
	});
});
