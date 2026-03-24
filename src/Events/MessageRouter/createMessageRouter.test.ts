import { Board } from "Board";
import { createMessageRouter } from "./createMessageRouter";

describe("createMessageRouter", () => {
	test("parses raw socket messages before dispatching", () => {
		const router = createMessageRouter();
		const board = new Board("board-1");
		const calls: unknown[] = [];

		router.addHandler("Mode", (message) => {
			calls.push(message);
		});
		router.handleMessage(
			{
				type: "Mode",
				boardId: "board-1",
				mode: "view",
			},
			board
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			type: "Mode",
			boardId: "board-1",
			mode: "view",
		});
	});

	test("rejects invalid raw socket messages", () => {
		const router = createMessageRouter();
		const board = new Board("board-1");
		let callCount = 0;
		const originalWarn = console.warn;
		const warnings: unknown[][] = [];
		console.warn = (...args: unknown[]) => {
			warnings.push(args);
		};

		router.addHandler("Mode", () => {
			callCount += 1;
		});
		router.handleMessage(
			{
				type: "Mode",
				boardId: "board-1",
				mode: "invalid",
			},
			board
		);

		expect(callCount).toBe(0);
		expect(warnings.length).toBeGreaterThan(0);

		console.warn = originalWarn;
	});
});
