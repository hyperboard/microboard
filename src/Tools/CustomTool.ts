import { BoardTool } from "Tools/BoardTool";
import { Board } from "Board";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Line } from "Items/Line/Line";
import { Mbr } from "Items/Mbr/Mbr";
import { conf } from "Settings";
import { DrawingContext } from "Items/DrawingContext";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { CursorName } from "Pointer/Cursor";
import { Item } from "Items/Item";
import {ADD_TO_SELECTION} from "../Items";

export interface ShapeToolSettings {
	cursorName?: CursorName;
	fixedRatio?: boolean;
}

export interface StickerToolSettings {
	width: number;
	height: number;
	cursorName?: CursorName;
}

export class CustomTool extends BoardTool {
	item: BaseItem;

	constructor(
		board: Board,
		public name: string,
		private itemClass: typeof BaseItem,
	) {
		super(board);
		this.item = new itemClass(board, "");
	}

	resetItem(): void {
		this.item = new this.itemClass(this.board, "");
	}
}

export class ShapeTool extends CustomTool {
	line: Line | undefined;
	resizeType: ResizeType = "leftBottom";
	bounds = new Mbr();
	isDown = false;

	constructor(
		board: Board,
		name: string,
		item: typeof BaseItem,
		private settings?: ShapeToolSettings,
	) {
		super(board, name, item);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor(this.settings?.cursorName || "crosshair");
	}

	initTransformation(sx?: number, sy?: number): void {
		sx = sx || this.bounds.getWidth() / 100;
		sy = sy || this.bounds.getHeight() / 100;
		this.item.transformation.apply({
			class: "Transformation",
			method: "translateTo",
			item: [this.item.getId()],
			x: this.bounds.left,
			y: this.bounds.top,
		});
		this.item.transformation.apply({
			class: "Transformation",
			method: "scaleTo",
			item: [this.item.getId()],
			x: sx,
			y: sy,
		});
	}

	pointerDown(): boolean {
		this.isDown = true;
		const point = this.board.pointer.point;
		this.line = new Line(point.copy(), point.copy());
		this.bounds = this.line.getMbr();
		this.bounds.borderColor = conf.SELECTION_COLOR;
		this.initTransformation();
		this.board.tools.publish();
		return true;
	}

	pointerMoveBy(_x: number, _y: number): boolean {
		if (this.line) {
			const startPoint = this.line.start.copy();
			const endPoint = this.board.pointer.point.copy();

			if (this.board.keyboard.isShift || this.settings?.fixedRatio) {
				const deltaX = endPoint.x - startPoint.x;
				const deltaY = endPoint.y - startPoint.y;
				const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
				endPoint.x = startPoint.x + Math.sign(deltaX) * maxDelta;
				endPoint.y = startPoint.y + Math.sign(deltaY) * maxDelta;
			}

			this.line = new Line(startPoint, endPoint);
			this.bounds = this.line.getMbr();
			this.bounds.borderColor = conf.SELECTION_COLOR;
			this.initTransformation();
			this.board.tools.publish();
			return true;
		}

		return false;
	}

	pointerUp(): boolean {
		const width = this.bounds.getWidth() < 2 ? 100 : this.bounds.getWidth();
		const height =
			this.bounds.getHeight() < 2 ? 100 : this.bounds.getHeight();
		this.initTransformation(width / 100, height / 100);
		const addedItem = this.board.add(this.item as Item);
		this.isDown = false;
		this.board.selection.removeAll();
		this.board.selection.add(addedItem);
		this.board.tools.select();
		this.board.tools.publish();

		return true;
	}

	keyDown(key: string): boolean {
		if (key === "Escape") {
			this.board.tools.select();
			return true;
		}
		return false;
	}

	render(context: DrawingContext): void {
		if (this.isDown) {
			this.item.render(context);
			this.bounds.render(context);
		}
	}
}

export class StickerTool extends CustomTool {
	constructor(
		board: Board,
		name: string,
		item: typeof BaseItem,
		private settings: StickerToolSettings,
	) {
		super(board, name, item);
		this.setCursor();
	}

	setCursor(): void {
		this.board.pointer.setCursor(this.settings?.cursorName || "crosshair");
	}

	pointerDown(): boolean {
		const point = this.board.pointer.point;
		this.item.transformation.apply({
			class: "Transformation",
			method: "translateTo",
			item: [this.item.getId()],
			x: point.x - this.settings.width / 2,
			y: point.y - this.settings.height / 2,
		});
		const width = this.item.getWidth();
		const height = this.item.getHeight();
		this.item.transformation.apply({
			class: "Transformation",
			method: "scaleBy",
			item: [this.item.getId()],
			x: width / this.settings.width,
			y: height / this.settings.height,
		});
		const addedItem = this.board.add(this.item as Item);
		this.board.selection.removeAll();
		this.board.selection.add(addedItem);
		this.board.tools.publish();
		this.resetItem();
		return true;
	}

	keyDown(key: string): boolean {
		if (key === "Escape") {
			this.board.tools.select();
			return true;
		}
		return false;
	}
}
