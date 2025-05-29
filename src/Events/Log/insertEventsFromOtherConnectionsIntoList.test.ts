import { initNodeSettings } from "Board/api/initNodeSettings";
initNodeSettings();

import { v4 as uuidv4 } from "uuid";
import { Board } from "Board";
import { BoardEvent, createEvents } from "../Events";
import { insertEventsFromOtherConnectionsIntoList } from "./insertEventsFromOtherConnectionsIntoList";
import { createEventsList, EventsList } from "./createEventsList";
import { createCommand } from "../Command";
import { SyncBoardEvent } from "../Events";
import { Operation } from "../EventsOperations";
import { CreateItem } from "Board/BoardOperations";
import { DefaultRichTextData } from "Board/Items/RichText/RichTextData";
import { ItemData, Mbr, RichText, RichTextOperation } from "Board/Items";
import { HistoryRecord } from "./EventsLog";
import { Selection } from "slate";
import { InsertTextOperation, Operation as SlateOp } from "slate";
import { deserializeAndApplyToList } from "./deserializeAndApplyToList";
import { ReactEditor } from "slate-react";
interface GetEventOpts {
	order?: number;
	eventId?: string;
	userId?: number;
	boardId?: string;
	lastKnownOrder?: number;
}

function getEvent(
	operation: Operation,
	{
		order = 0,
		eventId = "1",
		userId = 42,
		boardId = "1",
		lastKnownOrder = 0,
	}: GetEventOpts = {},
): SyncBoardEvent {
	return {
		order,
		userId: userId.toString(),
		lastKnownOrder,
		body: {
			eventId,
			userId,
			boardId,
			operation,
		},
	};
}

function getRecord(
	board: Board,
	operation: Operation,
	optionals: GetEventOpts = {},
): HistoryRecord {
	const command = createCommand(board, operation);
	const event = getEvent(operation, optionals);

	return { command, event };
}

interface GetAddItemOpParams {
	/** the single item ID (defaults to `"shapeId"`) */
	itemId?: string;
	/** override any of the default ItemData fields */
	dataOverrides?: Partial<ItemData>;
	/** optional timestamp */
	timeStamp?: number;
}

export function getAddItemOp(
	board: Board,
	{
		itemId = "shapeId",
		dataOverrides = {},
		timeStamp,
	}: GetAddItemOpParams = {},
): CreateItem {
	const defaultData: ItemData = {
		backgroundColor: "none",
		backgroundOpacity: 1,
		borderColor: "rgb(20, 21, 26)",
		borderOpacity: 1,
		borderStyle: "solid",
		borderWidth: 1,
		itemType: "Shape",
		shapeType: "Rectangle",
		transformation: {
			isLocked: false,
			rotate: 0,
			scaleX: 1,
			scaleY: 1,
			translateX: 0,
			translateY: 0,
		},
		text: { ...new RichText(board, new Mbr()).serialize() },
	};

	const op: CreateItem = {
		method: "add",
		class: "Board",
		item: itemId,
		data: { ...defaultData, ...dataOverrides },
		...(timeStamp !== undefined ? { timeStamp } : {}),
	};

	return op;
}
interface GetEditTextOpParams {
	/** the single rich-text item ID (defaults to `"richText"`) */
	itemId?: string;
	/** a resulting selection after operations */
	selection?: Selection;
	/** a list of insert_text ops (defaults to a single op inserting `"1"` at [0,0]) */
	ops?: Omit<InsertTextOperation, "type">[];
}

function getEditTextOp({
	itemId = "richText",
	selection = {
		anchor: { path: [0, 0], offset: 1 },
		focus: { path: [0, 0], offset: 1 },
	},
	ops = [{ path: [0, 0], offset: 0, text: "1" }],
}: GetEditTextOpParams = {}): RichTextOperation {
	return {
		class: "RichText",
		method: "edit",
		item: [itemId],
		selection,
		ops: ops.map(op => ({ ...op, type: "insert_text" })),
	};
}

describe("insertEventsFromOtherConnectionsIntoList", () => {
	let board: Board;
	let eventsList: EventsList;

	beforeEach(() => {
		// Создаем доску без реальной сетевой связи (используем boardId = "test-board")
		board = new Board("test-board");
		// Создаем события с undefined connection (режим local)
		const events = createEvents(board, undefined, 0);
		board.events = events;

		// Создаем реальный список событий
		eventsList = createEventsList(operation =>
			createCommand(board, operation),
		);
	});

	test("local unconfirmed: insert text and update selection. After reverting and applying local selection should remain the same", () => {
		// 1) add initial RichText item “text”
		const initAddEvent = getEvent(getAddItemOp(board, { itemId: "text" }));
		deserializeAndApplyToList([initAddEvent], eventsList, board);

		// 2) simulate offline local edit: insert "q","w","e" and select the "w"
		const localEditOp = getEditTextOp({
			itemId: "text",
			ops: [
				{ path: [0, 0], offset: 0, text: "q" },
				{ path: [0, 0], offset: 1, text: "w" },
				{ path: [0, 0], offset: 2, text: "e" },
			],
			selection: {
				anchor: { path: [0, 0], offset: 3 },
				focus: { path: [0, 0], offset: 3 },
			},
		});
		const localEditRecord = getRecord(board, localEditOp, {
			lastKnownOrder: 1,
		});
		eventsList.addNewRecords([localEditRecord]);
		// localEditRecord.command.apply();
		board.events.emit(localEditOp, localEditRecord.command);

		const rtBefore = board.items.getById("text")?.getRichText();
		if (!rtBefore) {
			throw new Error("Shape not found");
		}
		const selectionBefore = {
			anchor: { path: [0, 0], offset: 1 },
			focus: { path: [0, 0], offset: 2 },
		};
		board.selection.setContext("EditTextUnderPointer");
		board.selection.add(rtBefore);
		board.selection.setTextToEdit(rtBefore);
		rtBefore.editorTransforms.select(
			rtBefore.editor.editor,
			selectionBefore,
		);
		expect(rtBefore.editor.getSelection()).toEqual(selectionBefore);

		// 3) generate 10 “remote” text edits on the same item
		const remoteEventsAmount = 10;
		const remoteEvents = Array.from(
			{ length: remoteEventsAmount },
			(_, i) => {
				const remoteOp = getEditTextOp({
					itemId: "text",
					ops: [{ path: [0, 0], offset: i, text: `${i}` }],
				});
				return getEvent(remoteOp, {
					order: 2,
					lastKnownOrder: 1,
					userId: 123,
					eventId: `remote:${i}`,
				});
			},
		);

		// 4) call the fn under test
		insertEventsFromOtherConnectionsIntoList(
			remoteEvents,
			eventsList,
			board,
		);

		// 5) verify the Slate selection stayed at selected "w"
		const expectedSelection = {
			anchor: {
				path: [0, 0],
				offset: selectionBefore.anchor.offset + remoteEventsAmount,
			},
			focus: {
				path: [0, 0],
				offset: selectionBefore.focus.offset + remoteEventsAmount,
			},
		};
		const rtAfter = board.items.getById("text")?.getRichText();
		if (!rtAfter) {
			throw new Error("Shape not found");
		}
		expect(rtAfter.editor.getSelection()).toEqual(expectedSelection);
	});

	test("local unconfirmed: add new item, insert text and update selection. After reverting and applying local selection should remain the same", () => {
		// 1) add initial RichText item “text”
		const initAddEvent = getEvent(getAddItemOp(board, { itemId: "text" }));
		deserializeAndApplyToList([initAddEvent], eventsList, board);

		// 2) simulate local add and edit: insert "q","w","e" and select the "w"
		const localAddOp = getAddItemOp(board, { itemId: "localText" });
		const localAddRecord = getRecord(board, localAddOp, {
			lastKnownOrder: 1,
		});
		eventsList.addNewRecords([localAddRecord]);
		board.events.emit(localAddOp, localAddRecord.command);
		localAddRecord.command.apply();

		const localEditOp = getEditTextOp({
			itemId: "localText",
			ops: [
				{ path: [0, 0], offset: 0, text: "q" },
				{ path: [0, 0], offset: 1, text: "w" },
				{ path: [0, 0], offset: 2, text: "e" },
			],
			selection: {
				anchor: { path: [0, 0], offset: 3 },
				focus: { path: [0, 0], offset: 3 },
			},
		});
		const localEditRecord = getRecord(board, localEditOp, {
			lastKnownOrder: 1,
		});
		eventsList.addNewRecords([localEditRecord]);
		board.events.emit(localEditOp, localEditRecord.command);

		const rtBefore = board.items.getById("localText")?.getRichText();
		if (!rtBefore) {
			throw new Error("Shape not found");
		}
		const expectedSelection = {
			anchor: { path: [0, 0], offset: 1 },
			focus: { path: [0, 0], offset: 2 },
		};
		board.selection.setContext("EditTextUnderPointer");
		board.selection.setTextToEdit(rtBefore);
		board.selection.add(rtBefore);
		rtBefore.editorTransforms.select(
			rtBefore.editor.editor,
			expectedSelection,
		);
		expect(rtBefore.editor.getSelection()).toEqual(expectedSelection);

		// 3) generate 10 “remote” text edits on the same item
		const remoteEvents = Array.from({ length: 10 }, (_, i) => {
			const remoteOp = getEditTextOp({
				itemId: "text",
				ops: [{ path: [0, 0], offset: i, text: `${i}` }],
			});
			return getEvent(remoteOp, {
				order: 2,
				lastKnownOrder: 1,
				userId: 123,
				eventId: `remote:${i}`,
			});
		});

		// prevent .focus from slate react bc there is no react slate texteditor
		jest.spyOn(ReactEditor, "focus").mockImplementation(() => {});
		// 4) call the fn under test
		insertEventsFromOtherConnectionsIntoList(
			remoteEvents,
			eventsList,
			board,
		);

		// 5) verify the Slate selection stayed at selected "w"
		const rtAfter = board.items.getById("localText")?.getRichText();
		if (!rtAfter) {
			throw new Error("Shape not found");
		}
		expect(rtAfter.editor.getSelection()).toEqual(expectedSelection);
	});
});
