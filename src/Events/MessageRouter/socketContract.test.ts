import {
	BoardEventMsgSchema,
	BoardConnectResponseSchema,
	BoardSubscriptionCompletedMsgSchema,
	normalizeBoardSubscriptionCompletedMsg,
	parseOperation,
	parseSocketMsg,
	SocketOperationSchema,
} from "./socketContract";

describe("socketContract", () => {
	test("parses a board event message carrying a board add operation", () => {
		const parsed = parseSocketMsg({
			type: "BoardEvent",
			boardId: "board-1",
			sequenceNumber: 7,
			event: {
				order: 3,
				lastKnownOrder: 2,
				body: {
					eventId: "session-1:3",
					boardId: "board-1",
					sessionId: "session-1",
					operation: {
						class: "Board",
						method: "add",
						item: "item-1",
						data: {
							itemType: "Shape",
						},
					},
				},
			},
		});

		expect(parsed.type).toBe("BoardEvent");
		expect(parsed.event.body.operation.method).toBe("add");
	});

	test("accepts packed operations with actualId passthrough fields", () => {
		const parsed = BoardEventMsgSchema.parse({
			type: "BoardEvent",
			boardId: "board-1",
			sequenceNumber: 11,
			event: {
				order: 4,
				body: {
					eventId: "session-1:4",
					boardId: "board-1",
					lastKnownOrder: 3,
					operations: [
						{
							class: "Transformation",
							method: "applyMatrix",
							actualId: "session-1:4.1",
							items: [
								{
									id: "item-1",
									matrix: {
										translateX: 1,
										translateY: 2,
										scaleX: 1,
										scaleY: 1,
										shearX: 0,
										shearY: 0,
									},
								},
							],
						},
					],
				},
			},
		});

		expect("operations" in parsed.event.body).toBe(true);
	});

	test("rejects malformed board event messages", () => {
		const result = BoardEventMsgSchema.safeParse({
			type: "BoardEvent",
			boardId: "board-1",
			event: {
				order: 1,
				lastKnownOrder: 0,
				body: {
					eventId: "session-1:1",
					boardId: "board-1",
					operation: {
						class: "Board",
						method: "add",
						item: "item-1",
					},
				},
			},
		});

		expect(result.success).toBe(false);
	});

	test("rejects unknown operation classes", () => {
		const result = SocketOperationSchema.safeParse({
			class: "Unknown",
			method: "noop",
		});

		expect(result.success).toBe(false);
	});

	test("parses rich text selection operations", () => {
		const parsed = parseOperation({
			class: "RichText",
			method: "edit",
			item: ["text-1"],
			selection: {
				anchor: { path: [0, 0], offset: 0 },
				focus: { path: [0, 0], offset: 0 },
			},
			ops: [
				{
					type: "insert_text",
					offset: 0,
					text: "Hello",
				},
			],
		});

		expect(parsed.class).toBe("RichText");
		expect(parsed.method).toBe("edit");
	});

	test("parses board websocket handshake responses", () => {
		const parsed = BoardConnectResponseSchema.parse({
			wsUrl: "wss://example.com/api/v1/websocket/board-1/ws?token=jwt",
			jwt: "jwt",
			userId: "user-1",
			sessionId: "session-1",
			accessMode: "edit",
		});

		expect(parsed.accessMode).toBe("edit");
	});


	test("parses pong replies", () => {
		const parsed = parseSocketMsg({
			type: "pong",
		});

		expect(parsed.type).toBe("pong");
	});

	test("accepts loose wire BoardSubscriptionCompleted payloads", () => {
		const parsed = BoardSubscriptionCompletedMsgSchema.parse({
			type: "BoardSubscriptionCompleted",
			boardId: "board-1",
			mode: "view",
			initialSequenceNumber: 1,
			JSONSnapshot: {
				items: [],
				events: [],
				lastIndex: 0,
			},
			eventsSinceLastSnapshot: [],
		});

		expect(parsed.mode).toBe("view");
	});

	test("normalizes BoardSubscriptionCompleted into strict app shape", () => {
		const parsed = normalizeBoardSubscriptionCompletedMsg({
			type: "BoardSubscriptionCompleted",
			boardId: "board-1",
			mode: "edit",
			initialSequenceNumber: 1,
			JSONSnapshot: {
				items: [],
				events: [],
				lastIndex: 0,
			},
			eventsSinceLastSnapshot: [
				{
					order: 1,
					lastKnownOrder: 0,
					body: {
						eventId: "session-1:1",
						boardId: "board-1",
						operation: {
							class: "Events",
							method: "undo",
							eventId: "session-1:0",
						},
					},
				},
			],
		});

		expect(parsed.mode).toBe("edit");
		expect(parsed.JSONSnapshot?.lastIndex).toBe(0);
		expect(parsed.eventsSinceLastSnapshot).toHaveLength(1);
	});
});
