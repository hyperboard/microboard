import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board";
import { Mbr } from "Items/Mbr/Mbr";
import { Frame } from "Items/Frame/Frame";
import { NestingHighlighter } from "Tools/NestingHighlighter/NestingHighlighter";
import { updateFrameChildren } from "./updateFrameChildren";
import { Item } from "Items/Item";

describe("updateFrameChildren", () => {
  let board: Board;
  let nestingHighlighter: NestingHighlighter;
  let mockMbr: Mbr;
  let mockFrame: Frame;
  let mockItem: Item;
  let mockEnclosedFrame: Frame;

  beforeEach(() => {
    // Mock Frame
    mockFrame = {
      getId: () => "frame1",
      getMbr: () => new Mbr(10, 10, 50, 50),
      handleNesting: jest.fn().mockReturnValue(true),
      instanceOf: (type: any) => type === Frame,
    } as unknown as Frame;

    // Mock Item
    mockItem = {
      getId: () => "item1",
      getMbr: () => new Mbr(20, 20, 30, 30),
      parent: "Board",
      instanceOf: (type: any) => type !== Frame,
    } as unknown as Item;

    // Mock Enclosed Frame
    mockEnclosedFrame = {
      getId: () => "frame2",
      getMbr: () => new Mbr(15, 15, 45, 45),
      handleNesting: jest.fn().mockReturnValue(true),
      instanceOf: (type: any) => type === Frame,
    } as unknown as Frame;

    // Mock NestingHighlighter
    nestingHighlighter = {
      add: jest.fn(),
      remove: jest.fn(),
    } as unknown as NestingHighlighter;

    // Mock Board
    board = {
      items: {
        getFramesEnclosedOrCrossed: jest
          .fn()
          .mockReturnValue([mockEnclosedFrame]),
        getEnclosedOrCrossed: jest.fn().mockReturnValue([mockItem]),
      },
      selection: {
        items: {
          list: () => [mockFrame, mockItem],
        },
      },
    } as unknown as Board;

    // Mock MBR
    mockMbr = new Mbr(0, 0, 100, 100);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it("should handle frame items and update their children", () => {
    updateFrameChildren({
      mbr: mockMbr,
      board,
      nestingHighlighter,
    });

    // Verify that getFramesEnclosedOrCrossed was called with correct coordinates
    expect(board.items.getFramesEnclosedOrCrossed).toHaveBeenCalledWith(
      mockMbr.left,
      mockMbr.top,
      mockMbr.right,
      mockMbr.bottom
    );
  });

  it("should handle non-frame items and check their nesting in frames", () => {
    // Mock handleNesting to return false for some cases
    mockEnclosedFrame.handleNesting = jest.fn().mockReturnValue(false);

    updateFrameChildren({
      mbr: mockMbr,
      board,
      nestingHighlighter,
    });

    // Verify that handleNesting was called for the enclosed frame
    expect(mockEnclosedFrame.handleNesting).toHaveBeenCalledWith(mockItem);

    // Verify that nestingHighlighter.remove was called when nesting is invalid
    expect(nestingHighlighter.remove).toHaveBeenCalledWith(mockItem);
  });

  it("should handle empty selection", () => {
    board.selection.items.list = () => [];

    updateFrameChildren({
      mbr: mockMbr,
      board,
      nestingHighlighter,
    });

    // Verify that no nesting operations were performed
    expect(mockFrame.handleNesting).not.toHaveBeenCalled();
    expect(mockEnclosedFrame.handleNesting).not.toHaveBeenCalled();
    expect(nestingHighlighter.add).not.toHaveBeenCalled();
    expect(nestingHighlighter.remove).not.toHaveBeenCalled();
  });

  it("should handle no enclosed frames", () => {
    board.items.getFramesEnclosedOrCrossed = jest.fn().mockReturnValue([]);

    updateFrameChildren({
      mbr: mockMbr,
      board,
      nestingHighlighter,
    });

    // Verify that getFramesEnclosedOrCrossed was called
    expect(board.items.getFramesEnclosedOrCrossed).toHaveBeenCalled();

    // Verify that no frame nesting operations were performed
    expect(mockEnclosedFrame.handleNesting).not.toHaveBeenCalled();
    expect(nestingHighlighter.add).not.toHaveBeenCalledWith(
      mockEnclosedFrame,
      expect.anything()
    );
  });

  it("should handle no enclosed items in a frame", () => {
    board.items.getEnclosedOrCrossed = jest.fn().mockReturnValue([]);

    updateFrameChildren({
      mbr: mockMbr,
      board,
      nestingHighlighter,
    });

    // Verify that no item nesting operations were performed
    expect(mockFrame.handleNesting).not.toHaveBeenCalled();
    expect(nestingHighlighter.add).not.toHaveBeenCalledWith(
      mockFrame,
      expect.anything()
    );
  });
});
