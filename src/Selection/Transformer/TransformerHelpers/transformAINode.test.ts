import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board";
import { Matrix } from "Items/Transformation/Matrix";
import { Mbr } from "Items/Mbr/Mbr";
import { Point } from "Items/Point/Point";
import { AINode } from "Items/AINode/AINode";
import { Comment } from "Items/Comment/Comment";
import { transformAINode } from "./transformAINode";

describe("transformAINode", () => {
  let board: Board;
  let mockMatrix: Matrix;
  let mockMbr: Mbr;
  let mockOppositePoint: Point;
  let mockAINode: AINode;
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

    // Mock AINode with all required methods and properties
    mockAINode = {
      getId: () => "aiNode1",
      getMbr: () => new Mbr(10, 10, 50, 50),
      text: {
        getWidth: () => 40,
        getScale: () => 1,
        editor: {
          setMaxWidth: jest.fn(),
        },
        transformation: {
          translateBy: jest.fn(),
          scaleByTranslateBy: jest.fn(),
        },
      },
    } as unknown as AINode;

    // Mock Comment
    mockComment = {
      getId: () => "comment1",
      getMbr: () => new Mbr(60, 60, 100, 100),
      getItemToFollow: () => mockAINode.getId(),
    } as unknown as Comment;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it("should handle width resize", () => {
    const result = transformAINode({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockAINode,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: undefined,
    });

    expect(mockAINode.text.editor.setMaxWidth).toHaveBeenCalledWith(100); // mbr.getWidth() / scale
    expect(result).toEqual(expect.any(Mbr));
  });

  it("should handle following comments during resize", () => {
    // Mock board.items.getComments to return our mock comment
    board.items.getComments = () => [mockComment];

    const result = transformAINode({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockAINode,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: [mockComment],
    });

    expect(board.selection.transformMany).toHaveBeenCalled();
    expect(result).toEqual(expect.any(Mbr));
  });

  it("should handle different resize types", () => {
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

      const result = transformAINode({
        board,
        mbr: mockMbr,
        isWidth: false,
        resizeType,
        single: mockAINode,
        oppositePoint: mockOppositePoint,
        isHeight: true,
        isShiftPressed: false,
        followingComments: undefined,
      });

      expect(result).toEqual(expect.any(Mbr));
      if (resizeType.includes("right")) {
        expect(
          mockAINode.text.transformation.scaleByTranslateBy
        ).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.any(Number)
        );
      }
    });
  });

  it("should maintain aspect ratio when resizing", () => {
    const result = transformAINode({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockAINode,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: true, // Simulating shift key press for proportional resize
      followingComments: undefined,
    });

    expect(result).toEqual(expect.any(Mbr));
    expect(
      mockAINode.text.transformation.scaleByTranslateBy
    ).not.toHaveBeenCalled();
    expect(mockAINode.text.editor.setMaxWidth).toHaveBeenCalled();
  });

  it("should handle resize with custom scale", () => {
    // Mock AINode with custom scale
    mockAINode.text.getScale = () => 2;

    const result = transformAINode({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "right",
      single: mockAINode,
      oppositePoint: mockOppositePoint,
      isHeight: false,
      isShiftPressed: false,
      followingComments: undefined,
    });

    expect(mockAINode.text.editor.setMaxWidth).toHaveBeenCalledWith(50); // 100 / 2 (scale)
    expect(result).toEqual(expect.any(Mbr));
  });
});
