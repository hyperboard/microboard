import { Board } from "Board";
import { DrawingContext } from "Board/Items/DrawingContext";
import { isIframe } from "lib/isIframe";
import { Subject } from "Subject";
import { AddConnector } from "./AddConnector";
import { AddDrawing } from "./AddDrawing/AddDrawing";
import { AddFrame } from "./AddFrame";
import { AddShape } from "./AddShape";
import { AddSticker } from "./AddSticker";
import { AddText } from "./AddText";
import { BoardTool } from "./BoardTool";
import { ExportSnapshot } from "./ExportSnapshot/ExportSnapshot";
import { Navigate } from "./Navigate";
import { Select } from "./Select";
import { ToolContext } from "./ToolContext";
import { Item, Point } from "Board/Items";
import { ConnectedPointerDirection } from "Board/Items/Connector/Pointers";

export class Tools extends ToolContext {
	readonly subject = new Subject<Tools>();

	constructor(protected board: Board) {
		super();
	}

	setTool(tool: BoardTool): void {
		if (this.board.interfaceType === "view") {
			this.tool = new Navigate(this.board);
			return;
		}
		this.tool = tool;
		this.publish();
	}

	navigate(): void {
		if (this.board.interfaceType === "view") {
			this.tool = new Navigate(this.board);
			return;
		}
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
		if (this.board.interfaceType === "view") {
			this.tool = new Navigate(this.board);
			return;
		}
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
		if (this.board.interfaceType === "view") {
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
		if (this.board.interfaceType === "view") {
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
		if (this.board.interfaceType === "view") {
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
		if (this.board.interfaceType === "view") {
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
		if (this.board.interfaceType === "view") {
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
		return this.tool instanceof AddDrawing ? this.tool : undefined;
	}

	export(): void {
		if (this.board.interfaceType === "view") {
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
		if (this.board.interfaceType === "view") {
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
		if (this.board.interfaceType === "view") {
			this.tool = new Navigate(this.board);
			return;
		}
		this.tool.onCancel();
		this.tool = new Select(this.board);
		this.publish();
	}

	publish(): void {
		this.subject.publish(this);
	}

	render(context: DrawingContext): void {
		this.tool.render(context);
	}
}
