import { Board } from "Board";
import { DrawingContext } from "Board/Items/DrawingContext";
import { isIframe } from "lib/isIframe";
import { Subject } from "Subject";
import { AddConnector } from "./AddConnector";
import { AddDrawing, AddHighlighter } from "./AddDrawing";
import { AddFrame } from "./AddFrame";
import { AddShape } from "./AddShape";
import { AddSticker } from "./AddSticker";
import { AddText } from "./AddText";
import { BoardTool } from "./BoardTool";
import { ExportSnapshot } from "./ExportSnapshot/ExportSnapshot";
import { Navigate } from "./Navigate";
import { Select } from "./Select";
import { ToolContext } from "./ToolContext";
import { Frame, Item, Point } from "Board/Items";
import { Eraser } from "./Eraser";
import { AddComment } from "./AddComment";

export class Tools extends ToolContext {
	readonly subject = new Subject<Tools>();

	constructor(protected board: Board) {
		super();
	}

	setTool(tool: BoardTool): void {
		this.tool = tool;
		this.publish();
	}

	navigate(): void {
		if (this.getNavigate()) {
			this.cancel();
		} else {
			this.tool = new Navigate(this.board);
		}
		this.publish();
	}

	getNavigate(): Navigate | undefined {
		return this.tool instanceof Navigate ? this.tool : undefined;
	}

	select(clearSelection = false): void {
		if (this.getSelect()) {
			this.navigate();
		} else {
			this.tool = new Select(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getSelect(): Select | undefined {
		return this.tool instanceof Select ? this.tool : undefined;
	}

	addSticker(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddSticker() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddSticker(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	addShape(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddShape() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddShape(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddShape(): AddShape | undefined {
		return this.tool instanceof AddShape ? this.tool : undefined;
	}

	getAddSticker(): AddSticker | undefined {
		return this.tool instanceof AddSticker ? this.tool : undefined;
	}

	addText(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddText() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddText(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddText(): AddText | undefined {
		return this.tool instanceof AddText ? this.tool : undefined;
	}

	addConnector(
		clearSelection = false,
		itemToStart?: Item,
		position?: Point,
	): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddConnector() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddConnector(this.board, itemToStart, position);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddConnector(): AddConnector | undefined {
		return this.tool instanceof AddConnector ? this.tool : undefined;
	}

	addDrawing(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddDrawing()) {
			this.cancel();
		} else {
			this.tool = new AddDrawing(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddDrawing(): AddDrawing | undefined {
		return this.tool instanceof AddDrawing && !this.tool.isHighlighter()
			? this.tool
			: undefined;
	}

	addHighlighter(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddHighlighter()) {
			this.cancel();
		} else {
			this.tool = new AddHighlighter(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddHighlighter(): AddHighlighter | undefined {
		return this.tool instanceof AddHighlighter && this.tool.isHighlighter()
			? this.tool
			: undefined;
	}

	eraser(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getEraser()) {
			this.cancel();
		} else {
			this.tool = new Eraser(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getEraser(): Eraser | undefined {
		return this.tool instanceof Eraser ? this.tool : undefined;
	}

	addComment(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddComment() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddComment(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddComment(): AddComment | undefined {
		return this.tool instanceof AddComment ? this.tool : undefined;
	}

	export(): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getExport()) {
			this.cancel();
		} else {
			this.tool = new ExportSnapshot(this.board);
		}
		this.publish();
	}

	getExport(): ExportSnapshot | undefined {
		return this.tool instanceof ExportSnapshot ? this.tool : undefined;
	}

	addFrame(clearSelection = false): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		if (this.getAddFrame() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddFrame(this.board);
			if (clearSelection) {
				this.board.selection.removeAll();
			}
		}
		this.publish();
	}

	getAddFrame(): AddFrame | undefined {
		return this.tool instanceof AddFrame ? this.tool : undefined;
	}

	cancel(): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		this.tool.onCancel();
		this.tool = new Select(this.board);
		this.publish();
	}

	confirm(): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}
		this.tool.onConfirm();
		this.tool = new Select(this.board);
		this.publish();
	}

	publish(): void {
		this.board.isBoardMenuOpen = false;
		this.subject.publish(this);
	}

	sortFrames(): Frame[] {
		const frames = this.board.items.listFrames();
		const sortedFrames = frames.sort((fr1, fr2) => {
			const mbr1 = fr1.getMbr();
			const mbr2 = fr2.getMbr();

			if (mbr1.left !== mbr2.left) {
				return mbr1.left - mbr2.left;
			}

			return mbr1.top - mbr2.top;
		});
		return sortedFrames;
	}

	getNewFrameIndex(frames: Frame[], direction: "next" | "prev"): number {
		const currentFrameId = localStorage.getItem(`lastVisitedFrame`);
		let currentFrameIndex = frames.findIndex(
			frame => frame.getId() === currentFrameId,
		);

		if (currentFrameIndex < 0) {
			currentFrameIndex = 0;
		}

		const newIndex =
			direction === "prev"
				? currentFrameIndex - 1
				: currentFrameIndex + 1;

		if (direction === "prev" && newIndex < 0) {
			return frames.length - 1;
		}

		if (direction === "next" && newIndex > frames.length - 1) {
			return 0;
		}

		return newIndex;
	}

	frameNavigation(direction: "next" | "prev"): void {
		if (this.board.getInterfaceType() !== "edit") {
			this.tool = new Navigate(this.board);
			return;
		}

		const frames = this.sortFrames();
		if (frames.length === 0) {
			return;
		}

		const newFrameIndex = this.getNewFrameIndex(frames, direction);
		const frameMbr = frames[newFrameIndex]?.getMbr();
		const zoomOffset = 15;

		this.board.camera.zoomToFit(frameMbr, zoomOffset);
		this.board.selection.removeAll();
		this.board.selection.items.removeAll();
		this.board.selection.items.add(frames[newFrameIndex]);
		localStorage.setItem(`lastVisitedFrame`, frames[newFrameIndex].getId());
		this.publish();
	}

	render(context: DrawingContext): void {
		this.tool.render(context);
	}
}
