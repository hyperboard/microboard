import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board";
import { Matrix } from "Items/Transformation/Matrix";
import { Mbr } from "Items/Mbr/Mbr";
import { Item } from "Items/Item";
import { RichText } from "Items/RichText/RichText";
import { AINode } from "Items/AINode/AINode";
import { Sticker } from "Items/Sticker/Sticker";
import { Frame } from "Items/Frame/Frame";
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

    expect(result.find(r => r.id === mockRichText.getId())).toEqual({
      id: mockRichText.getId(),
      matrix: { translateX: mockMatrix.translateX, translateY: 0, scaleX: mockMatrix.scaleX, scaleY: mockMatrix.scaleX, shearX: 0, shearY: 0 },
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

    expect(result.find(r => r.id === mockRichText.getId())).toEqual({
      id: mockRichText.getId(),
      matrix: { translateX: 20, translateY: 20, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
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

    expect(result.find(r => r.id === mockAINode.getId())).toEqual({
      id: mockAINode.getId(),
      matrix: { translateX: mockMatrix.translateX, translateY: 0, scaleX: mockMatrix.scaleX, scaleY: mockMatrix.scaleX, shearX: 0, shearY: 0 },
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

    expect(result.find(r => r.id === mockSticker.getId())).toEqual({
      id: mockSticker.getId(),
      matrix: { translateX: 40, translateY: 40, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 },
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

    expect(result.find(r => r.id === mockFrame.getId())).toEqual({
      id: mockFrame.getId(),
      matrix: { translateX: 50, translateY: 50, scaleX: mockMatrix.scaleX, scaleY: mockMatrix.scaleY, shearX: 0, shearY: 0 },
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

    expect(result).toHaveLength(4);
    expect(result.find(r => r.id === mockRichText.getId())).toBeDefined();
    expect(result.find(r => r.id === mockAINode.getId())).toBeDefined();
    expect(result.find(r => r.id === mockSticker.getId())).toBeDefined();
    expect(result.find(r => r.id === mockFrame.getId())).toBeDefined();
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

    expect(result.find(r => r.id === mockDrawing.getId())).toEqual({
      id: mockDrawing.getId(),
      matrix: { translateX: 60, translateY: 60, scaleX: mockMatrix.scaleX, scaleY: mockMatrix.scaleY, shearX: 0, shearY: 0 },
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

    expect(result).toHaveLength(2);
    expect(result.find(r => r.id === mockRichText.getId())).toBeDefined();
    expect(result.find(r => r.id === mockComment.getId())).toBeDefined();
  });
});
