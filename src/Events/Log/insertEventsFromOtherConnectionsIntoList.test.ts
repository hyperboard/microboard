import { v4 as uuidv4 } from "uuid";
import { Board } from "Board";
import { createEvents } from "../Events";
import { insertEventsFromOtherConnectionsIntoList } from "./insertEventsFromOtherConnectionsIntoList";
import { createEventsList } from "./createEventsList";
import { createCommand } from "../Command";
import { SyncBoardEvent } from "../Events";
import { Operation } from "../EventsOperations";

describe("insertEventsFromOtherConnectionsIntoList", () => {
	let board: Board;
	let eventsList;

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

		// Шпионим за методами для проверки вызовов
		jest.spyOn(eventsList, "revertUnconfirmed");
		jest.spyOn(eventsList, "applyUnconfirmed");
		jest.spyOn(eventsList, "addConfirmedRecords");
		jest.spyOn(board.selection, "memoize");
		jest.spyOn(board.selection, "applyMemoized");
	});

	test("должен игнорировать пустой массив событий", () => {
		insertEventsFromOtherConnectionsIntoList([], eventsList, board);

		expect(board.selection.memoize).not.toHaveBeenCalled();
		expect(eventsList.revertUnconfirmed).not.toHaveBeenCalled();
	});

	test("должен корректно обрабатывать одно событие добавления элемента", () => {
		const itemId = uuidv4();
		const singleEvent: SyncBoardEvent = {
			type: "board",
			id: "event1",
			order: 1,
			userId: "user1",
			lastKnownOrder: 0,
			body: {
				eventId: "event1",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "add",
					item: itemId,
					data: {
						itemType: "Shape",
						shapeType: "rectangle",
						transformation: {
							translateX: 100,
							translateY: 100,
							scaleX: 1,
							scaleY: 1,
							shearX: 0,
							shearY: 0,
							rotation: 0,
						},
						style: {
							fill: "#ff0000",
							stroke: "#000000",
							strokeWidth: 1,
						},
					},
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(
			singleEvent,
			eventsList,
			board,
		);

		// Проверки вызовов методов
		expect(board.selection.memoize).toHaveBeenCalled();
		expect(eventsList.revertUnconfirmed).toHaveBeenCalled();
		expect(eventsList.addConfirmedRecords).toHaveBeenCalled();
		expect(eventsList.applyUnconfirmed).toHaveBeenCalled();
		expect(board.selection.applyMemoized).toHaveBeenCalled();

		// Проверка, что элемент действительно добавлен в доску
		const addedItem = board.items.getById(itemId);
		expect(addedItem).toBeDefined();
		expect(addedItem.itemType).toBe("Shape");
	});

	test("должен корректно обрабатывать несколько событий", () => {
		const itemId1 = uuidv4();
		const itemId2 = uuidv4();
		const events: SyncBoardEvent[] = [
			{
				type: "board",
				id: "event1",
				order: 1,
				userId: "user1",
				lastKnownOrder: 0,
				body: {
					eventId: "event1",
					userId: 1,
					boardId: "test-board",
					operation: {
						class: "Board",
						method: "add",
						item: itemId1,
						data: {
							itemType: "Shape",
							shapeType: "rectangle",
							transformation: {
								translateX: 100,
								translateY: 100,
								scaleX: 1,
								scaleY: 1,
								shearX: 0,
								shearY: 0,
								rotation: 0,
							},
							style: {
								fill: "#ff0000",
								stroke: "#000000",
								strokeWidth: 1,
							},
						},
					} as Operation,
				},
			},
			{
				type: "board",
				id: "event2",
				order: 2,
				userId: "user1",
				lastKnownOrder: 1,
				body: {
					eventId: "event2",
					userId: 1,
					boardId: "test-board",
					operation: {
						class: "Board",
						method: "add",
						item: itemId2,
						data: {
							itemType: "Shape",
							shapeType: "ellipse",
							transformation: {
								translateX: 200,
								translateY: 200,
								scaleX: 1,
								scaleY: 1,
								shearX: 0,
								shearY: 0,
								rotation: 0,
							},
							style: {
								fill: "#00ff00",
								stroke: "#000000",
								strokeWidth: 1,
							},
						},
					} as Operation,
				},
			},
		];

		insertEventsFromOtherConnectionsIntoList(events, eventsList, board);

		// Проверка, что оба элемента добавлены на доску
		expect(board.items.getById(itemId1)).toBeDefined();
		expect(board.items.getById(itemId2)).toBeDefined();
		expect(eventsList.addConfirmedRecords).toHaveBeenCalled();

		// Проверка, что элементы правильного типа
		expect(board.items.getById(itemId1).itemType).toBe("Shape");
		expect(board.items.getById(itemId2).itemType).toBe("Shape");

		// Проверка правильных форм
		expect(board.items.getById(itemId1).getShapeType()).toBe("rectangle");
		expect(board.items.getById(itemId2).getShapeType()).toBe("ellipse");
	});

	test("должен обрабатывать событие редактирования элемента", () => {
		// Сначала добавляем элемент
		const itemId = uuidv4();
		const addEvent: SyncBoardEvent = {
			type: "board",
			id: "event1",
			order: 1,
			userId: "user1",
			lastKnownOrder: 0,
			body: {
				eventId: "event1",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "add",
					item: itemId,
					data: {
						itemType: "Shape",
						shapeType: "rectangle",
						transformation: {
							translateX: 100,
							translateY: 100,
							scaleX: 1,
							scaleY: 1,
							shearX: 0,
							shearY: 0,
							rotation: 0,
						},
						style: {
							fill: "#ff0000",
							stroke: "#000000",
							strokeWidth: 1,
						},
					},
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(addEvent, eventsList, board);

		// Проверяем начальный цвет заливки
		const addedItem = board.items.getById(itemId);
		expect(addedItem.style.fill).toBe("#ff0000");

		// Теперь модифицируем элемент
		const modifyEvent: SyncBoardEvent = {
			type: "board",
			id: "event2",
			order: 2,
			userId: "user1",
			lastKnownOrder: 1,
			body: {
				eventId: "event2",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Shape",
					method: "setProperty",
					item: itemId,
					property: "style",
					value: {
						fill: "#0000ff",
						stroke: "#000000",
						strokeWidth: 1,
					},
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(
			modifyEvent,
			eventsList,
			board,
		);

		// Проверяем, что цвет элемента изменился
		const modifiedItem = board.items.getById(itemId);
		expect(modifiedItem.style.fill).toBe("#0000ff");
	});

	test("должен обрабатывать событие перемещения элемента", () => {
		// Сначала добавляем элемент
		const itemId = uuidv4();
		const addEvent: SyncBoardEvent = {
			type: "board",
			id: "event1",
			order: 1,
			userId: "user1",
			lastKnownOrder: 0,
			body: {
				eventId: "event1",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "add",
					item: itemId,
					data: {
						itemType: "Shape",
						shapeType: "rectangle",
						transformation: {
							translateX: 100,
							translateY: 100,
							scaleX: 1,
							scaleY: 1,
							shearX: 0,
							shearY: 0,
							rotation: 0,
						},
						style: {
							fill: "#ff0000",
							stroke: "#000000",
							strokeWidth: 1,
						},
					},
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(addEvent, eventsList, board);

		// Проверяем начальные координаты
		const addedItem = board.items.getById(itemId);
		expect(addedItem.transformation.translateX).toBe(100);
		expect(addedItem.transformation.translateY).toBe(100);

		// Теперь перемещаем элемент
		const moveEvent: SyncBoardEvent = {
			type: "board",
			id: "event2",
			order: 2,
			userId: "user1",
			lastKnownOrder: 1,
			body: {
				eventId: "event2",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Transformation",
					method: "set",
					item: itemId,
					property: "translateX",
					value: 200,
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(moveEvent, eventsList, board);

		// Проверяем, что координаты элемента изменились
		const movedItem = board.items.getById(itemId);
		expect(movedItem.transformation.translateX).toBe(200);
		expect(movedItem.transformation.translateY).toBe(100); // Y не менялся
	});

	test("должен обрабатывать удаление элемента", () => {
		// Сначала добавляем элемент
		const itemId = uuidv4();
		const addEvent: SyncBoardEvent = {
			type: "board",
			id: "event1",
			order: 1,
			userId: "user1",
			lastKnownOrder: 0,
			body: {
				eventId: "event1",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "add",
					item: itemId,
					data: {
						itemType: "Shape",
						shapeType: "rectangle",
						transformation: {
							translateX: 100,
							translateY: 100,
							scaleX: 1,
							scaleY: 1,
							shearX: 0,
							shearY: 0,
							rotation: 0,
						},
						style: {
							fill: "#ff0000",
							stroke: "#000000",
							strokeWidth: 1,
						},
					},
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(addEvent, eventsList, board);

		// Проверяем, что элемент добавлен
		expect(board.items.getById(itemId)).toBeDefined();

		// Теперь удаляем элемент
		const removeEvent: SyncBoardEvent = {
			type: "board",
			id: "event2",
			order: 2,
			userId: "user1",
			lastKnownOrder: 1,
			body: {
				eventId: "event2",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "remove",
					item: [itemId],
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(
			removeEvent,
			eventsList,
			board,
		);

		// Проверяем, что элемент удален
		expect(board.items.getById(itemId)).toBeUndefined();
	});

	test("должен обрабатывать события конфликтов (последовательность с пропусками)", () => {
		// Добавляем начальное подтвержденное событие
		const itemId = uuidv4();
		const initialEvent: SyncBoardEvent = {
			type: "board",
			id: "event1",
			order: 1,
			userId: "user1",
			lastKnownOrder: 0,
			body: {
				eventId: "event1",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "add",
					item: itemId,
					data: {
						itemType: "Shape",
						shapeType: "rectangle",
						transformation: {
							translateX: 100,
							translateY: 100,
							scaleX: 1,
							scaleY: 1,
							shearX: 0,
							shearY: 0,
							rotation: 0,
						},
						style: {
							fill: "#ff0000",
							stroke: "#000000",
							strokeWidth: 1,
						},
					},
				} as Operation,
			},
		};

		// Добавляем событие в список подтвержденных
		const initialCommand = createCommand(
			board,
			initialEvent.body.operation,
		);
		initialCommand.apply();
		eventsList.addConfirmedRecords([
			{
				event: initialEvent,
				command: initialCommand,
			},
		]);

		// Событие с последовательностью 3, но lastKnownOrder = 1
		// Это указывает на пропуск события с order = 2
		const conflictEvent: SyncBoardEvent = {
			type: "board",
			id: "event3",
			order: 3,
			userId: "user1",
			lastKnownOrder: 1, // Пропуск order=2
			body: {
				eventId: "event3",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Transformation",
					method: "set",
					item: itemId,
					property: "translateY",
					value: 300,
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(
			conflictEvent,
			eventsList,
			board,
		);

		// Проверяем, что событие было применено несмотря на пропуск
		const transformedItem = board.items.getById(itemId);
		expect(transformedItem).toBeDefined();
		expect(transformedItem.transformation.translateY).toBe(300);
	});

	test("должен объединять схожие события", () => {
		// Добавляем элемент
		const itemId = uuidv4();
		const addEvent: SyncBoardEvent = {
			type: "board",
			id: "event1",
			order: 1,
			userId: "user1",
			lastKnownOrder: 0,
			body: {
				eventId: "event1",
				userId: 1,
				boardId: "test-board",
				operation: {
					class: "Board",
					method: "add",
					item: itemId,
					data: {
						itemType: "Shape",
						shapeType: "rectangle",
						transformation: {
							translateX: 100,
							translateY: 100,
							scaleX: 1,
							scaleY: 1,
							shearX: 0,
							shearY: 0,
							rotation: 0,
						},
						style: {
							fill: "#ff0000",
							stroke: "#000000",
							strokeWidth: 1,
						},
					},
				} as Operation,
			},
		};

		insertEventsFromOtherConnectionsIntoList(addEvent, eventsList, board);

		// Два события, которые могут быть объединены: изменение цвета одного и того же элемента
		const colorEvents: SyncBoardEvent[] = [
			{
				type: "board",
				id: "event2",
				order: 2,
				userId: "user1",
				lastKnownOrder: 1,
				body: {
					eventId: "event2",
					userId: 1,
					boardId: "test-board",
					operation: {
						class: "Shape",
						method: "setProperty",
						item: itemId,
						property: "style",
						value: {
							fill: "#00ff00",
							stroke: "#000000",
							strokeWidth: 1,
						},
					} as Operation,
				},
			},
			{
				type: "board",
				id: "event3",
				order: 3,
				userId: "user1",
				lastKnownOrder: 2,
				body: {
					eventId: "event3",
					userId: 1,
					boardId: "test-board",
					operation: {
						class: "Shape",
						method: "setProperty",
						item: itemId,
						property: "style",
						value: {
							fill: "#0000ff",
							stroke: "#000000",
							strokeWidth: 1,
						},
					} as Operation,
				},
			},
		];

		// Перед применением событий, подсчитаем текущее количество событий в списке
		const initialRecordsCount = eventsList.getConfirmedRecords().length;

		insertEventsFromOtherConnectionsIntoList(
			colorEvents,
			eventsList,
			board,
		);

		// Проверяем, что оба события были применены
		const modifiedItem = board.items.getById(itemId);
		expect(modifiedItem.style.fill).toBe("#0000ff"); // Последний цвет

		// Проверяем, что события были объединены (количество записей должно увеличиться меньше чем на 2)
		// В идеальном случае объединения, должна быть только одна запись
		const finalRecordsCount = eventsList.getConfirmedRecords().length;
		expect(finalRecordsCount).toBe(initialRecordsCount + 1);
	});
});
