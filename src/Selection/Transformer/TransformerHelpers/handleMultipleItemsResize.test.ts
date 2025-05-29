import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board/Board";
import { Matrix } from "Board/Items/Transformation/Matrix";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Item } from "Board/Items/Item";
import { RichText } from "Board/Items/RichText/RichText";
import { AINode } from "Board/Items/AINode/AINode";
import { Sticker } from "Board/Items/Sticker/Sticker";
import { Frame } from "Board/Items/Frame/Frame";
import { handleMultipleItemsResize } from "./handleMultipleItemsResize";

describe("handleMultipleItemsResize", () => {
	let board: Board;
	let mockMatrix: Matrix;
	let mockMbr: Mbr;
	let mockInitMbr: Mbr;
	let mockRichText: RichText;
	let mockAINode: AINode;
	let mockSticker: Sticker;
	let mockFrame: Frame;

	beforeEach(() => {
		// Mock Board
		board = {
			selection: {
				items: {
					list: () => [],
				},
			},
			items: {
				getComments: () => [],
			},
		} as unknown as Board;

		// Mock Matrix
		mockMatrix = new Matrix();
		mockMatrix.scaleX = 2;
		mockMatrix.scaleY = 2;
		mockMatrix.translateX = 10;
		mockMatrix.translateY = 10;

		// Mock MBRs
		mockMbr = new Mbr(0, 0, 100, 100);
		mockInitMbr = new Mbr(0, 0, 100, 100);

		// Mock Items
		mockRichText = {
			getId: () => "richText1",
			getMbr: () => new Mbr(10, 10, 50, 50),
			getWidth: () => 40,
			transformation: {
				getScale: () => ({ x: 1, y: 1 }),
			},
			editor: {
				setMaxWidth: jest.fn(),
			},
		} as unknown as RichText;

		mockAINode = {
			getId: () => "aiNode1",
			getMbr: () => new Mbr(20, 20, 60, 60),
			text: {
				getWidth: () => 40,
				editor: {
					setMaxWidth: jest.fn(),
				},
			},
			transformation: {
				getScale: () => ({ x: 1, y: 1 }),
			},
		} as unknown as AINode;

		mockSticker = {
			getId: () => "sticker1",
			getMbr: () => new Mbr(30, 30, 70, 70),
			itemType: "Sticker",
		} as unknown as Sticker;

		mockFrame = {
			getId: () => "frame1",
			getMbr: () => new Mbr(40, 40, 80, 80),
			itemType: "Frame",
			getCanChangeRatio: () => true,
			getFrameType: () => "Default",
			setFrameType: jest.fn(),
		} as unknown as Frame;
	});

	it("should handle RichText resize with width", () => {
		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockRichText],
		});

		expect(result[mockRichText.getId()]).toEqual({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [mockRichText.getId()],
			translate: { x: 20, y: 20 },
			scale: { x: mockMatrix.scaleX, y: mockMatrix.scaleX },
		});
	});

	it("should handle RichText resize with height", () => {
		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: false,
			isHeight: true,
			isShiftPressed: false,
			itemsToResize: [mockRichText],
		});

		expect(result[mockRichText.getId()]).toEqual({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [mockRichText.getId()],
			translate: { x: 20, y: 20 }, // Calculated from deltas
			scale: { x: 2, y: 2 },
		});
	});

	it("should handle AINode resize with width", () => {
		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockAINode],
		});

		expect(result[mockAINode.getId()]).toEqual({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [mockAINode.getId()],
			translate: { x: 30, y: 30 },
			scale: { x: 2, y: 2 },
		});
	});

	it("should handle Sticker resize with width", () => {
		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockSticker],
		});

		expect(result[mockSticker.getId()]).toEqual({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [mockSticker.getId()],
			translate: { x: 40, y: 40 }, // Calculated from deltas
			scale: { x: 2, y: 2 },
		});
	});

	it("should handle Frame resize and update frame type when shift is not pressed", () => {
		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: false,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockFrame],
		});

		expect(result[mockFrame.getId()]).toEqual({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [mockFrame.getId()],
			translate: { x: 50, y: 50 }, // Calculated from deltas
			scale: { x: mockMatrix.scaleX, y: mockMatrix.scaleY },
		});
	});

	it("should handle multiple items resize", () => {
		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: false,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockRichText, mockAINode, mockSticker, mockFrame],
		});

		expect(Object.keys(result)).toHaveLength(4);
		expect(result[mockRichText.getId()]).toBeDefined();
		expect(result[mockAINode.getId()]).toBeDefined();
		expect(result[mockSticker.getId()]).toBeDefined();
		expect(result[mockFrame.getId()]).toBeDefined();
	});

	it("should handle Drawing item type", () => {
		const mockDrawing = {
			getId: () => "drawing1",
			itemType: "Drawing",
			getMbr: () => new Mbr(50, 50, 90, 90),
			transformation: {
				matrix: {
					translateX: 50,
					translateY: 50,
				},
			},
		} as unknown as Item;

		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: false,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockDrawing],
		});

		expect(result[mockDrawing.getId()]).toEqual({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [mockDrawing.getId()],
			translate: { x: 60, y: 60 }, // Calculated using matrix.translateX/Y
			scale: { x: mockMatrix.scaleX, y: mockMatrix.scaleY },
		});
	});

	it("should include comments that follow items", () => {
		const mockComment = {
			getId: () => "comment1",
			getMbr: () => new Mbr(60, 60, 100, 100),
			getItemToFollow: () => mockRichText.getId(),
		} as unknown as Item;

		board.items.getComments = () => [mockComment];

		const result = handleMultipleItemsResize({
			board,
			resize: { matrix: mockMatrix, mbr: mockMbr },
			initMbr: mockInitMbr,
			isWidth: false,
			isHeight: false,
			isShiftPressed: false,
			itemsToResize: [mockRichText],
		});

		expect(Object.keys(result)).toHaveLength(2);
		expect(result[mockRichText.getId()]).toBeDefined();
		expect(result[mockComment.getId()]).toBeDefined();
	});
});
