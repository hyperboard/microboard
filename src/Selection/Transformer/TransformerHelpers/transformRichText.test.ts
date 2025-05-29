import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board/Board";
import { Matrix } from "Board/Items/Transformation/Matrix";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Point } from "Board/Items/Point/Point";
import { RichText } from "Board/Items/RichText/RichText";
import { Comment } from "Board/Items/Comment/Comment";
import { transformRichText } from "./transformRichText";

describe("transformRichText", () => {
	let board: Board;
	let mockMatrix: Matrix;
	let mockMbr: Mbr;
	let mockOppositePoint: Point;
	let mockRichText: RichText;
	let mockComment: Comment;

	beforeEach(() => {
		// Mock Board with all required properties
		board = {
			pointer: {
				point: new Point(100, 100),
				getCursor: () => "default",
				setCursor: jest.fn(),
			},
			selection: {
				shouldRenderItemsMbr: true,
				transformMany: jest.fn(),
			},
			items: {
				getComments: () => [],
			},
		} as unknown as Board;

		// Mock Matrix with specific values for testing
		mockMatrix = new Matrix();
		mockMatrix.scaleX = 2;
		mockMatrix.scaleY = 2;
		mockMatrix.translateX = 10;
		mockMatrix.translateY = 10;

		// Mock MBR and Point
		mockMbr = new Mbr(0, 0, 100, 100);
		mockOppositePoint = new Point(0, 0);

		// Mock RichText with all required methods
		mockRichText = {
			getId: () => "richText1",
			getMbr: () => new Mbr(10, 10, 50, 50),
			getWidth: () => 40,
			getHeight: () => 40,
			getTextString: () => "Short text",
			getScale: () => 1,
			transformation: {
				translateBy: jest.fn(),
				scaleByTranslateBy: jest.fn(),
			},
			editor: {
				setMaxWidth: jest.fn(),
			},
			left: 10,
			top: 10,
		} as unknown as RichText;

		// Mock Comment
		mockComment = {
			getId: () => "comment1",
			getMbr: () => new Mbr(60, 60, 100, 100),
			getItemToFollow: () => mockRichText.getId(),
		} as unknown as Comment;

		// Reset all mocks before each test
		jest.clearAllMocks();
	});

	it("should handle width resize for short text", () => {
		const result = transformRichText({
			board,
			mbr: mockMbr,
			isWidth: true,
			resizeType: "right",
			single: mockRichText,
			oppositePoint: mockOppositePoint,
			isHeight: false,
			isShiftPressed: false,
			followingComments: undefined,
		});

		expect(result).toEqual({
			resizedMbr: expect.any(Mbr),
		});
	});

	it("should handle width resize for long text", () => {
		mockRichText.getTextString = () => "x".repeat(6000); // Long text
		// Mock pointer position for right resize
		Object.defineProperty(board.pointer, "point", {
			value: new Point(mockMbr.right + 50, mockMbr.top + 50),
			writable: true,
		});

		const result = transformRichText({
			board,
			mbr: mockMbr,
			isWidth: true,
			resizeType: "right",
			single: mockRichText,
			oppositePoint: mockOppositePoint,
			isHeight: false,
			isShiftPressed: false,
			followingComments: undefined,
		});

		expect(result).not.toBeNull();
		if (result) {
			expect(board.pointer.setCursor).toHaveBeenCalledWith("w-resize");
			expect(board.selection.shouldRenderItemsMbr).toBe(false);
			expect(result).toEqual({
				resizedMbr: expect.any(Mbr),
				onPointerUpCb: expect.any(Function),
			});

			// Test onPointerUp callback
			result.onPointerUpCb?.();
			expect(board.pointer.setCursor).toHaveBeenCalledWith("default");
			expect(board.selection.shouldRenderItemsMbr).toBe(true);
			expect(mockRichText.editor.setMaxWidth).toHaveBeenCalled();
		}
	});

	it("should handle height resize for long text", () => {
		mockRichText.getTextString = () => "x".repeat(6000); // Long text
		// Mock pointer position for bottom-right resize
		Object.defineProperty(board.pointer, "point", {
			value: new Point(mockMbr.right + 50, mockMbr.bottom + 50),
			writable: true,
		});

		const result = transformRichText({
			board,
			mbr: mockMbr,
			isWidth: false,
			resizeType: "rightBottom",
			single: mockRichText,
			oppositePoint: mockOppositePoint,
			isHeight: true,
			isShiftPressed: false,
			followingComments: undefined,
		});

		expect(result).not.toBeNull();
		if (result) {
			expect(board.pointer.setCursor).toHaveBeenCalledWith("nwse-resize");
			expect(board.selection.shouldRenderItemsMbr).toBe(false);
			expect(result).toEqual({
				resizedMbr: expect.any(Mbr),
				onPointerUpCb: expect.any(Function),
			});

			// Test onPointerUp callback
			result.onPointerUpCb?.();
			expect(board.pointer.setCursor).toHaveBeenCalledWith("default");
			expect(board.selection.shouldRenderItemsMbr).toBe(true);
			expect(
				mockRichText.transformation.scaleByTranslateBy,
			).toHaveBeenCalled();
		}
	});

	it("should handle following comments during resize", () => {
		// Mock board.items.getComments to return our mock comment
		board.items.getComments = () => [mockComment];

		const result = transformRichText({
			board,
			mbr: mockMbr,
			isWidth: true,
			resizeType: "right",
			single: mockRichText,
			oppositePoint: mockOppositePoint,
			isHeight: false,
			isShiftPressed: false,
			followingComments: [mockComment],
		});

		expect(board.selection.transformMany).toHaveBeenCalled();
		expect(result).toEqual({
			resizedMbr: expect.any(Mbr),
		});
	});

	it("should prevent resize when pointer is too close to opposite edge for long text", () => {
		mockRichText.getTextString = () => "x".repeat(6000); // Long text
		// Mock pointer position too close to left edge
		Object.defineProperty(board.pointer, "point", {
			value: new Point(mockMbr.left + 50, mockMbr.top + 50),
			writable: true,
		});

		const result = transformRichText({
			board,
			mbr: mockMbr,
			isWidth: true,
			resizeType: "left",
			single: mockRichText,
			oppositePoint: mockOppositePoint,
			isHeight: false,
			isShiftPressed: false,
			followingComments: undefined,
		});

		expect(result).toBeNull();
	});

	it("should handle different resize types for long text", () => {
		mockRichText.getTextString = () => "x".repeat(6000); // Long text
		const resizeTypes = [
			"leftTop",
			"rightTop",
			"leftBottom",
			"rightBottom",
		] as const;
		const expectedCursors = [
			"nwse-resize",
			"nesw-resize",
			"nesw-resize",
			"nwse-resize",
		];

		resizeTypes.forEach((resizeType, index) => {
			// Mock pointer position based on resize type
			const point = new Point(
				resizeType.includes("right")
					? mockMbr.right + 50
					: mockMbr.left - 50,
				resizeType.includes("Bottom")
					? mockMbr.bottom + 50
					: mockMbr.top - 50,
			);
			Object.defineProperty(board.pointer, "point", {
				value: point,
				writable: true,
			});

			const result = transformRichText({
				board,
				mbr: mockMbr,
				isWidth: false,
				resizeType,
				single: mockRichText,
				oppositePoint: mockOppositePoint,
				isHeight: true,
				isShiftPressed: false,
				followingComments: undefined,
			});

			expect(result).not.toBeNull();
			if (result) {
				expect(board.pointer.setCursor).toHaveBeenCalledWith(
					expectedCursors[index],
				);
				expect(result).toEqual({
					resizedMbr: expect.any(Mbr),
					onPointerUpCb: expect.any(Function),
				});
			}
		});
	});
});
