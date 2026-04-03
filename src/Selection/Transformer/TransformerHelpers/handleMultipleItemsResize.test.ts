import { Board } from "Board";
import { Matrix } from "Geometry/Transformation/Matrix";
import { Mbr } from "Geometry/Mbr/Mbr";
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

  const createMockItem = (id: string, type: string, x: number, y: number) => {
    const matrix = new Matrix(x, y, 1, 1);
    return {
      id,
      itemType: type,
      parent: "Board",
      getId: () => id,
      getMbr: () => new Mbr(x, y, x + 40, y + 40),
      getWorldMbr: () => new Mbr(x, y, x + 40, y + 40),
      getWorldMatrix: () => matrix.copy(),
      transformation: {
        toMatrix: () => matrix.copy(),
        getMatrixData: () => matrix.getMatrixData(),
        getScale: () => ({ x: 1, y: 1 }),
      },
      getWidth: () => 40,
      getHeight: () => 40,
      apply: jest.fn(),
    };
  };

  beforeEach(() => {
    // Mock Board
    board = {
      selection: {
        items: {
          list: jest.fn(() => []),
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

    // Mock Items — use Object.create so instanceof checks pass
    mockRichText = Object.assign(Object.create(RichText.prototype), createMockItem("richText1", "RichText", 10, 10), {
      editor: {
        setMaxWidth: jest.fn(),
      },
    }) as unknown as RichText;

    mockAINode = Object.assign(Object.create(AINode.prototype), createMockItem("aiNode1", "AINode", 20, 20), {
      text: {
        id: "aiNode1-text",
        getId: () => "aiNode1-text",
        getWidth: () => 40,
        getWorldMatrix: () => new Matrix(20, 20, 1, 1),
        editor: {
          setMaxWidth: jest.fn(),
        },
      },
    }) as unknown as AINode;

    mockSticker = Object.assign(Object.create(Sticker.prototype), createMockItem("sticker1", "Sticker", 30, 30)) as unknown as Sticker;

    mockFrame = Object.assign(Object.create(Frame.prototype), createMockItem("frame1", "Frame", 40, 40), {
      getCanChangeRatio: () => true,
      getFrameType: () => "Default",
      setFrameType: jest.fn(),
    }) as unknown as Frame;
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
      worldMatrix: expect.objectContaining({ translateX: 10 + mockMatrix.translateX }),
      prevWorldMatrix: expect.any(Object),
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
      worldMatrix: expect.objectContaining({ translateX: 30, translateY: 30 }),
      prevWorldMatrix: expect.any(Object),
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
      worldMatrix: expect.objectContaining({ translateX: 20 + mockMatrix.translateX }),
      prevWorldMatrix: expect.any(Object),
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
      worldMatrix: expect.objectContaining({ translateX: 70, translateY: 70 }),
      prevWorldMatrix: expect.any(Object),
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
      worldMatrix: expect.objectContaining({ scaleX: 2, scaleY: 2 }),
      prevWorldMatrix: expect.any(Object),
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
    const mockDrawing = createMockItem("drawing1", "Drawing", 50, 50);

    const result = handleMultipleItemsResize({
      board,
      resize: { matrix: mockMatrix, mbr: mockMbr },
      initMbr: mockInitMbr,
      isWidth: false,
      isHeight: false,
      isShiftPressed: false,
      itemsToResize: [mockDrawing] as unknown as Item[],
    });

    expect(result.find(r => r.id === mockDrawing.id)).toEqual({
      id: mockDrawing.id,
      worldMatrix: expect.objectContaining({ translateX: 110, translateY: 110 }),
      prevWorldMatrix: expect.any(Object),
    });
  });

  it("should include comments that follow items", () => {
    const mockComment = createMockItem("comment1", "Comment", 60, 60);
    Object.assign(mockComment, {
      getItemToFollow: () => mockRichText.getId(),
    });

    board.items.getComments = () => [mockComment as unknown as any];

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
    expect(result.find(r => r.id === mockComment.id)).toBeDefined();
  });
});
