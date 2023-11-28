import React from "react";
import { Descendant, Editor, Transforms } from "slate";
import { act } from "react-test-renderer";
import { Slate, Editable } from "slate-react";

import renderer from "react-test-renderer";
import { assert } from "chai";
import { UserService } from "../../../../User";
import { Board } from "../../../Board";
import { RichText } from "../RichText";
import { ProxyHistoryEditor } from "./RichTextEditor";
import { Mbr } from "Board/Items/Mbr";

const createNodeMock = () => ({
	ownerDocument: document,
	getRootNode: () => document,
});

describe("slate-react", () => {
	it("выясняем как слушать группы эвентов из Slate, а не каждый эвент в отдельности;", async () => {
		const server = new ServerMock();
		const firstUserService = new UserService(1, 10);
		const firstBoard = new Board("1", server, firstUserService);
		const secondUserService = new UserService(2, 20);
		const secondBoard = new Board("2", server, secondUserService);

		const firstBoardText = new RichText(
			new Mbr(),
			firstUserService.getNextLocalItemId(),
			firstBoard.events,
		);

		const firstBoardSlateProxy = firstBoardText.editor;
		assert(firstBoardSlateProxy);

		const firstBoardEditor = firstBoardSlateProxy.editorProxy;

		firstBoard.add(firstBoardText);

		renderSlate(firstBoardEditor);

		await act(async () => {
			Transforms.insertNodes(firstBoardEditor, [
				{
					type: "block-quote",
					children: [{ type: "text", text: "first-act: text 1" }],
				},
			]);
		});

		await act(async () => {
			Transforms.insertText(firstBoardEditor, "first-act: text 2");
		});

		await act(async () => {
			Transforms.insertNodes(firstBoardEditor, [
				{
					type: "block-quote",
					children: [{ type: "text", text: "second-act: text 3" }],
				},
			]);
		});

		await act(async () => {
			Transforms.insertText(firstBoardEditor, "second-act: text 4");
		});

		await act(async () => {
			firstBoardEditor.undo();
		});

		await act(async () => {
			firstBoardEditor.redo();
		});

		// 2 renders, one for the main element and one for the split element
		expect(firstBoard.events?.list).toEqual(secondBoard.events?.list);

		const secondBoardText = secondBoard.items.findById(
			firstBoardText.getId(),
		) as RichText;
		assert(secondBoardText);
		const secondBoardSlateProxy = secondBoardText.editor;
		assert(secondBoardSlateProxy);
		expect(firstBoardSlateProxy.editorProxy.operations).toEqual(
			secondBoardSlateProxy.editorProxy.operations,
		);
	});

	it("проверяем выделение текста и применение свойств Slate", async () => {
		const server = new ServerMock();
		const userSerivce = new UserService(1, 10);
		const board = new Board("1", server, userSerivce);

		const richText = new RichText(
			new Mbr(),
			userSerivce.getNextLocalItemId(),
			board.events,
		);
		const slateProxy = richText.editor;
		const editorProxy = slateProxy.editorProxy;

		renderSlate(editorProxy);

		await act(async () => {
			Transforms.insertNodes(editorProxy, [
				{
					type: "block-quote",
					children: [{ type: "text", text: "first-act: text 1" }],
				},
			]);
		});

		await act(async () => {
			Transforms.insertText(editorProxy, "first-act: text 2");
		});

		await act(async () => {
			Transforms.select(editorProxy, [0, 0]);
		});

		assert(editorProxy.marks);
	});
});

function renderSlate(
	editorProxy: ProxyHistoryEditor & Editor,
	// начальные операции Slate
	value: Descendant[] = [],
): void {
	act(() => {
		const root: renderer.ReactTestRenderer = renderer.create(
			<Slate
				editor={editorProxy}
				value={value}
				onChange={result => {
					console.info(result);
				}}
			>
				<Editable />
			</Slate>,
			{ createNodeMock },
		);

		// проверка утверждений
		expect(root.toJSON()).toMatchSnapshot();
	});
}
