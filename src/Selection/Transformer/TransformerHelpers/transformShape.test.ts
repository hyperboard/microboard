import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board";
import { Matrix } from "Items/Transformation/Matrix";
import { Mbr } from "Items/Mbr/Mbr";
import { Point } from "Items/Point/Point";
import { Sticker } from "Items/Sticker/Sticker";
import { Shape } from "Items/Shape/Shape";
import { Frame } from "Items/Frame/Frame";
import { Comment } from "Items/Comment/Comment";
import { transformShape } from "./transformShape.ts";

describe("transformShape", () => {
  let board: Board;
  let mockMatrix: Matrix;
  let mockMbr: Mbr;
  let mockOppositePoint: Point;
  let mockSticker: Sticker;
  let mockShape: Shape;
  let mockFrame: Frame;
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
        items: {
          list: jest.fn().mockReturnValue([]),
        },
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

    // Mock Sticker
    mockSticker = {
      itemType: "Sticker",
      getId: () => "sticker1",
      getMbr: () => new Mbr(10, 10, 50, 50),
      doResize: jest.fn().mockReturnValue({ mbr: new Mbr(10, 10, 60, 60) }),
    } as unknown as Sticker;

    // Mock Shape
    mockShape = {
      itemType: "Shape",
      getId: () => "shape1",
      getMbr: () => new Mbr(10, 10, 50, 50),
      doResize: jest.fn().mockReturnValue({ mbr: new Mbr(10, 10, 60, 60) }),
    } as unknown as Shape;

    // Mock Frame
    mockFrame = {
      itemType: "Frame",
      getId: () => "frame1",
      getMbr: () => new Mbr(10, 10, 50, 50),
      doResize: jest.fn().mockReturnValue({ mbr: new Mbr(10, 10, 60, 60) }),
    } as unknown as Frame;

    // Mock Comment
    mockComment = {
      getId: () => "comment1",
      getMbr: () => new Mbr(60, 60, 100, 100),
      getItemToFollow: () => mockShape.getId(),
    } as unknown as Comment;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it("should handle regular resize for Sticker", () => {
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockSticker,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: undefined,
    });

    expect(mockSticker.doResize).toHaveBeenCalledWith(
      "right",
      board.pointer.point,
      mockMbr,
      mockOppositePoint,
      expect.any(Mbr),
      expect.any(Number)
    );
    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: null,
    });
  });

  it("should handle proportional resize for Shape", () => {
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockShape,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: true,
      followingComments: undefined,
    });

    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: expect.any(Object),
    });
    expect(mockShape.doResize).not.toHaveBeenCalled();
  });

  it("should handle regular resize for Frame", () => {
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockFrame,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: undefined,
    });

    expect(mockFrame.doResize).toHaveBeenCalledWith(
      "right",
      board.pointer.point,
      mockMbr,
      mockOppositePoint,
      expect.any(Mbr),
      expect.any(Number)
    );
    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: null,
    });
  });

  it("should handle following comments during resize", () => {
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockShape,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: [mockComment],
    });

    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: expect.any(Object),
    });
    expect(mockShape.doResize).toHaveBeenCalled();
  });

  it("should handle different resize types for Shape", () => {
    const resizeTypes = [
      "leftTop",
      "rightTop",
      "leftBottom",
      "rightBottom",
    ] as const;

    resizeTypes.forEach((resizeType) => {
      // Mock pointer position based on resize type
      const point = new Point(
        resizeType.includes("right") ? mockMbr.right + 50 : mockMbr.left - 50,
        resizeType.includes("Bottom") ? mockMbr.bottom + 50 : mockMbr.top - 50
      );
      Object.defineProperty(board.pointer, "point", {
        value: point,
        writable: true,
      });

      const result = transformShape({
        board,
        mbr: mockMbr,
        isWidth: false,
        resizeType,
        single: mockShape,
        oppositePoint: mockOppositePoint,
        isHeight: true,
        isShiftPressed: false,
        followingComments: undefined,
      });

      expect(result).toEqual({
        resizedMbr: expect.any(Mbr),
        translation: null,
      });
      expect(mockShape.doResize).toHaveBeenCalledWith(
        resizeType,
        point,
        mockMbr,
        mockOppositePoint,
        expect.any(Mbr),
        expect.any(Number)
      );
    });
  });

  it("should handle proportional resize with startMbr", () => {
    const startMbr = new Mbr(5, 5, 45, 45);
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockShape,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: true,
      followingComments: undefined,
      startMbr,
    });

    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: expect.any(Object),
    });
  });

  it("should handle Sticker resize with proportional transform", () => {
    // Even with isShiftPressed, Sticker should use regular resize
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockSticker,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: true,
      followingComments: undefined,
    });

    expect(mockSticker.doResize).toHaveBeenCalled();
    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: null,
    });
  });

  it("should handle resize with multiple following comments", () => {
    const mockComment2 = {
      ...mockComment,
      getId: () => "comment2",
    } as Comment;

    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockShape,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: [mockComment, mockComment2],
    });

    expect(result).toEqual({
      resizedMbr: expect.any(Mbr),
      translation: expect.any(Object),
    });
    expect(mockShape.doResize).toHaveBeenCalled();
  });
});
