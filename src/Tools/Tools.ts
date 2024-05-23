import { Board } from "Board";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Subject } from "Subject";
import { AddConnector } from "./AddConnector";
import { AddDrawing } from "./AddDrawing/AddDrawing";
import { AddShape } from "./AddShape";
import { AddFrame } from "./AddFrame";
import { AddText } from "./AddText";
import { Navigate } from "./Navigate";
import { Select } from "./Select";
import { ToolContext } from "./ToolContext";
import { BoardTool } from "./BoardTool";
import { AddSticker } from "./AddSticker";
import { isIframe } from "lib/isIframe";
import { ExportSnapshot } from "./ExportSnapshot/ExportSnapshot";

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

	select(): void {
		if (this.getSelect()) {
			this.navigate();
		} else {
			this.tool = new Select(this.board);
		}
		this.publish();
	}

	getSelect(): Select | undefined {
		return this.tool instanceof Select ? this.tool : undefined;
	}

	addSticker(): void {
		if (this.getAddSticker() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddSticker(this.board);
		}
		this.publish();
	}

	addShape(): void {
		if (this.getAddShape() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddShape(this.board);
		}
		this.publish();
	}

	getAddShape(): AddShape | undefined {
		return this.tool instanceof AddShape ? this.tool : undefined;
	}
	getAddSticker(): AddSticker | undefined {
		return this.tool instanceof AddSticker ? this.tool : undefined;
	}

	addText(): void {
		if (this.getAddText() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddText(this.board);
		}
		this.publish();
	}

	getAddText(): AddText | undefined {
		return this.tool instanceof AddText ? this.tool : undefined;
	}

	addConnector(): void {
		if (this.getAddConnector() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddConnector(this.board);
		}
		this.publish();
	}

	getAddConnector(): AddConnector | undefined {
		return this.tool instanceof AddConnector ? this.tool : undefined;
	}

	addDrawing(): void {
		if (this.getAddDrawing() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddDrawing(this.board);
		}
		this.publish();
	}

	getAddDrawing(): AddDrawing | undefined {
		return this.tool instanceof AddDrawing ? this.tool : undefined;
	}

	export(): void {
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

	addFrame(): void {
		if (this.getAddFrame() && !isIframe()) {
			this.cancel();
		} else {
			this.tool = new AddFrame(this.board);
		}
		this.publish();
	}

	getAddFrame(): AddFrame | undefined {
		return this.tool instanceof AddFrame ? this.tool : undefined;
	}

	cancel(): void {
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
