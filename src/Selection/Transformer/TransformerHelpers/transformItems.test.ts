import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Board } from "Board/Board";
import { Matrix } from "Board/Items/Transformation/Matrix";
import { Mbr } from "Board/Items/Mbr/Mbr";
import { Point } from "Board/Items/Point/Point";
import { Selection } from "Board/Selection/Selection";
import { CanvasDrawer } from "Board/drawMbrOnCanvas";
import AlignmentHelper from "Board/Tools/RelativeAlignment";
import { ResizeType } from "./getResizeType";
import { DebounceUpdater } from "Board/Tools/DebounceUpdater/DebounceUpdater";
import { transformItems } from "./transformItems";
import { ImageItem } from "Board/Items/Image/Image";
import { Sticker } from "Board/Items/Sticker/Sticker";
import { RichText } from "Board/Items/RichText/RichText";
import { Frame } from "Board/Items/Frame/Frame";
import { tempStorage } from "App/SessionStorage";
import { Item } from "Board/Items/Item";
import { Line } from "Board/Items/Line/Line";

describe("transformItems", () => {
	let board: Board;
	let selection: Selection;
	let canvasDrawer: CanvasDrawer;
	let alignmentHelper: AlignmentHelper;
	let debounceUpd: DebounceUpdater;
	let mockMbr: Mbr;
	let mockOppositePoint: Point;
	let mockImage: ImageItem;
	let mockSticker: Sticker;
	let mockRichText: RichText;
	let mockFrame: Frame;

	beforeEach(() => {
		// Mock Board
		board = {
			pointer: {
				point: new Point(100, 100),
				getCursor: () => "default",
				setCursor: jest.fn(),
			},
			selection: {
				items: {
					list: () => [] as Item[],
				},
			},
			items: {
				getComments: () => [] as Item[],
			},
		} as unknown as Board;

		// Mock Selection
		selection = {
			items: {
				list: () => [] as Item[],
			},
			transformMany: jest.fn(),
		} as unknown as Selection;

		// Mock CanvasDrawer
		canvasDrawer = {
			getLastCreatedCanvas: jest.fn().mockReturnValue(null),
			recoordinateCanvas: jest.fn(),
			scaleCanvasTo: jest.fn(),
			clearCanvasAndKeys: jest.fn(),
			updateCanvasAndKeys: jest.fn(),
		} as unknown as CanvasDrawer;

		// Mock AlignmentHelper
		const mockSnapToSide = jest.fn().mockReturnValue(false);
		alignmentHelper = {
			checkAlignment: jest
				.fn()
				.mockReturnValue({ verticalLines: [], horizontalLines: [] }),
			snapToSide: mockSnapToSide,
			combineMBRs: jest.fn().mockReturnValue(new Mbr(0, 0, 100, 100)),
		} as unknown as AlignmentHelper;

		// Mock DebounceUpdater
		debounceUpd = {
			shouldUpd: jest.fn().mockReturnValue(true),
			setFalse: jest.fn(),
			setTimeoutUpdate: jest.fn(),
		} as unknown as DebounceUpdater;

		// Mock MBR and Point
		mockMbr = new Mbr(0, 0, 100, 100);
		mockOppositePoint = new Point(0, 0);

		// Mock Image
		mockImage = {
			itemType: "Image",
			getId: () => "image1",
			getMbr: () => new Mbr(10, 10, 50, 50),
		} as unknown as ImageItem;

		// Mock Sticker
		mockSticker = {
			itemType: "Sticker",
			getId: () => "sticker1",
			getMbr: () => new Mbr(10, 10, 50, 50),
		} as unknown as Sticker;

		// Mock RichText
		mockRichText = {
			itemType: "RichText",
			getId: () => "richtext1",
			getMbr: () => new Mbr(10, 10, 50, 50),
		} as unknown as RichText;

		// Mock Frame
		mockFrame = {
			itemType: "Frame",
			getId: () => "frame1",
			getMbr: () => new Mbr(10, 10, 50, 50),
			getCanChangeRatio: () => true,
		} as unknown as Frame;

		// Reset all mocks
		jest.clearAllMocks();
	});

	it("should handle basic resize transformation", () => {
		const result = transformItems({
			board,
			selection,
			canvasDrawer,
			alignmentHelper,
			debounceUpd,
			resizeType: "right" as ResizeType,
			mbr: mockMbr,
			oppositePoint: mockOppositePoint,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			beginTimeStamp: Date.now(),
			single: null,
			snapCursorPos: null,
			setSnapCursorPos: jest.fn(),
		});

		expect(selection.transformMany).toHaveBeenCalled();
		expect(result).toBeInstanceOf(Mbr);
	});

	it("should handle proportional resize with shift key", () => {
		const result = transformItems({
			board,
			selection,
			canvasDrawer,
			alignmentHelper,
			debounceUpd,
			resizeType: "right" as ResizeType,
			mbr: mockMbr,
			oppositePoint: mockOppositePoint,
			isWidth: true,
			isHeight: false,
			isShiftPressed: true,
			beginTimeStamp: Date.now(),
			single: null,
			snapCursorPos: null,
			setSnapCursorPos: jest.fn(),
		});

		expect(selection.transformMany).toHaveBeenCalled();
		expect(result).toBeInstanceOf(Mbr);
	});

	it("should return null for proportional items when resizing width or height", () => {
		selection.items.list = () => [mockSticker] as Item[];

		const result = transformItems({
			board,
			selection,
			canvasDrawer,
			alignmentHelper,
			debounceUpd,
			resizeType: "right" as ResizeType,
			mbr: mockMbr,
			oppositePoint: mockOppositePoint,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			beginTimeStamp: Date.now(),
			single: null,
			snapCursorPos: null,
			setSnapCursorPos: jest.fn(),
		});

		expect(result).toBeNull();
	});

	it("should handle snapping behavior", () => {
		alignmentHelper.snapToSide = jest.fn().mockReturnValue(true);
		const setSnapCursorPos = jest.fn();

		const result = transformItems({
			board,
			selection,
			canvasDrawer,
			alignmentHelper,
			debounceUpd,
			resizeType: "right" as ResizeType,
			mbr: mockMbr,
			oppositePoint: mockOppositePoint,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			beginTimeStamp: Date.now(),
			single: null,
			snapCursorPos: null,
			setSnapCursorPos,
		});

		expect(setSnapCursorPos).toHaveBeenCalled();
		expect(result).toBeInstanceOf(Mbr);
	});

	it("should handle canvas drawing for large transformations", () => {
		const mockTranslation = { item1: { x: 10, y: 10 } };
		jest.spyOn(selection, "transformMany").mockImplementation(() => {
			Object.assign(mockTranslation, { item2: { x: 20, y: 20 } });
		});

		const result = transformItems({
			board,
			selection,
			canvasDrawer,
			alignmentHelper,
			debounceUpd,
			resizeType: "right" as ResizeType,
			mbr: mockMbr,
			oppositePoint: mockOppositePoint,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			beginTimeStamp: Date.now(),
			single: null,
			snapCursorPos: null,
			setSnapCursorPos: jest.fn(),
		});

		expect(result).toBeInstanceOf(Mbr);
	});

	it("should handle fixed frame ratio preservation", () => {
		const fixedFrame = {
			...mockFrame,
			getCanChangeRatio: () => false,
		} as unknown as Frame;
		selection.items.list = () => [fixedFrame] as Item[];

		const result = transformItems({
			board,
			selection,
			canvasDrawer,
			alignmentHelper,
			debounceUpd,
			resizeType: "right" as ResizeType,
			mbr: mockMbr,
			oppositePoint: mockOppositePoint,
			isWidth: true,
			isHeight: false,
			isShiftPressed: false,
			beginTimeStamp: Date.now(),
			single: null,
			snapCursorPos: null,
			setSnapCursorPos: jest.fn(),
		});

		expect(result).toBeInstanceOf(Mbr);
		expect(selection.transformMany).toHaveBeenCalled();
	});
});
