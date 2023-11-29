import { Board } from "Board";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Subject } from "Subject";
import { AddConnector } from "./AddConnector";
import { AddDrawing } from "./AddDrawing/AddDrawing";
import { AddShape } from "./AddShape";
import { AddText } from "./AddText";
import { Navigate } from "./Navigate";
import { Select } from "./Select";
import { ToolContext } from "./ToolContext";
import { BoardTool } from "./BoardTool";

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
		if (this.getAddSticker()) {
			this.cancel();
		} else {
			this.tool = new AddShape(this.board);
			this.tool.setShapeType("Sticker");
		}
		this.publish();
	}
	addShape(): void {
		if (this.getAddShape()) {
			this.cancel();
		} else {
			this.tool = new AddShape(this.board);
		}
		this.publish();
	}

	getAddShape(): AddShape | undefined {
		return (this.tool instanceof AddShape && this.tool.type !== "Sticker") ? this.tool : undefined;
	}
	getAddSticker(): AddShape | undefined {
		return (this.tool instanceof AddShape && this.tool.type === "Sticker" ) ? this.tool : undefined;
	}

	addText(): void {
		if (this.getAddText()) {
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
		if (this.getAddConnector()) {
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
		if (this.getAddDrawing()) {
			this.cancel();
		} else {
			this.tool = new AddDrawing(this.board);
		}
		this.publish();
	}

	getAddDrawing(): AddDrawing | undefined {
		return this.tool instanceof AddDrawing ? this.tool : undefined;
	}

	cancel(): void {
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
