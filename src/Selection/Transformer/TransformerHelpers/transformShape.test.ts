import { Board } from "Board";
import { Matrix } from "Items/Transformation/Matrix";
import { Mbr } from "Items/Mbr/Mbr";
import { Point } from "Items/Point/Point";
import { Sticker } from "Items/Sticker/Sticker";
import { Shape } from "Items/Shape/Shape";
import { Frame } from "Items/Frame/Frame";
import { Comment } from "Items/Comment/Comment";
import { transformShape } from "./transformShape";

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
    // Mock Matrix
    mockMatrix = new Matrix();
    mockMatrix.scaleX = 2;
    mockMatrix.scaleY = 2;
    mockMatrix.translateX = 10;
    mockMatrix.translateY = 10;

    // Mock MBR and Point
    mockMbr = new Mbr(0, 0, 100, 100);
    mockOppositePoint = new Point(0, 0);

    const mockItemBase = {
      apply: jest.fn(),
      getMbr: () => new Mbr(10, 10, 50, 50),
      getWorldMbr: () => new Mbr(10, 10, 50, 50),
      getWorldMatrix: () => new Matrix(10, 10, 1, 1),
      getCanChangeRatio: () => true,
      getFrameType: () => "None",
      setFrameType: jest.fn(),
    };

    // Mock Sticker
    mockSticker = {
      ...mockItemBase,
      id: "sticker1",
      getId: () => "sticker1",
      itemType: "Sticker",
    } as unknown as Sticker;

    // Mock Shape
    mockShape = {
      ...mockItemBase,
      id: "shape1",
      getId: () => "shape1",
      itemType: "Shape",
    } as unknown as Shape;

    // Mock Frame
    mockFrame = {
      ...mockItemBase,
      id: "frame1",
      getId: () => "frame1",
      itemType: "Frame",
    } as unknown as Frame;

    // Mock Board with all required properties
    board = {
      pointer: {
        point: new Point(100, 100),
      },
      selection: {
        moveMany: jest.fn(),
        items: {
          list: jest.fn(() => []),
        },
      },
      items: {
        getComments: () => [],
      },
    } as unknown as Board;

    // Mock Comment
    mockComment = {
      id: "comment1",
      getId: () => "comment1",
      getMbr: () => new Mbr(60, 60, 100, 100),
      getWorldMbr: () => new Mbr(60, 60, 100, 100),
      getWorldMatrix: () => new Matrix(10, 10, 1, 1),
      getItemToFollow: () => "shape1",
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

    expect(result.resizedMbr).toEqual(expect.any(Mbr));
    expect(result.translation).toHaveLength(1);
    expect(result.translation![0].id).toBe("sticker1");
  });

  it("should handle proportional resize for Shape", () => {
    (board.selection.items.list as jest.Mock).mockReturnValue([mockShape]);
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "rightBottom",
      single: mockShape,
      oppositePoint: mockOppositePoint,
      isHeight: true,
      isShiftPressed: true,
      followingComments: undefined,
    });

    expect(result.resizedMbr).toEqual(expect.any(Mbr));
    expect(result.translation).toHaveLength(1);
    expect(result.translation![0].id).toBe("shape1");
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

    expect(result.resizedMbr).toEqual(expect.any(Mbr));
    expect(result.translation).toHaveLength(1);
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

    expect(result.translation).toHaveLength(2); // shape + comment
    expect(result.translation).toContainEqual(expect.objectContaining({ id: "comment1" }));
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
        isWidth: true,
        resizeType,
        single: mockShape,
        oppositePoint: mockOppositePoint,
        isHeight: true,
        isShiftPressed: false,
        followingComments: undefined,
      });

      expect(result.resizedMbr).toEqual(expect.any(Mbr));
      expect(result.translation).toHaveLength(1);
    });
  });

  it("should handle proportional resize with startMbr", () => {
    (board.selection.items.list as jest.Mock).mockReturnValue([mockShape]);
    const startMbr = new Mbr(0, 0, 100, 100);
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "rightBottom",
      single: mockShape,
      oppositePoint: mockOppositePoint,
      isHeight: true,
      isShiftPressed: true,
      followingComments: undefined,
      startMbr,
    });

    expect(result.resizedMbr).toEqual(expect.any(Mbr));
    expect(result.translation).toHaveLength(1);
    expect(result.translation![0].id).toBe("shape1");
  });

  it("should handle Sticker resize with proportional transform", () => {
    const result = transformShape({
      board,
      mbr: mockMbr,
      isWidth: true,
      resizeType: "rightBottom",
      single: mockSticker,
      oppositePoint: mockOppositePoint,
      isHeight: true,
      isShiftPressed: true,
      followingComments: undefined,
    });

    expect(result.resizedMbr).toEqual(expect.any(Mbr));
    expect(result.translation).toHaveLength(1);
  });

  it("should handle resize with multiple following comments", () => {
    const mockComment2 = {
      id: "comment2",
      getId: () => "comment2",
      getMbr: () => new Mbr(120, 120, 150, 150),
      getWorldMbr: () => new Mbr(120, 120, 150, 150),
      getWorldMatrix: () => new Matrix(10, 10, 1, 1),
      getItemToFollow: () => "shape1",
    } as unknown as Comment;

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

    expect(result.translation).toHaveLength(3); // shape + 2 comments
    expect(result.translation).toContainEqual(expect.objectContaining({ id: "comment1" }));
    expect(result.translation).toContainEqual(expect.objectContaining({ id: "comment2" }));
  });
});
