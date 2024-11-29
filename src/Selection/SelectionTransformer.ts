import { Board } from "../Board";
import { DrawingContext } from "../Items/DrawingContext";
import { Tool } from "../Tools/Tool";
import { ConnectorTransformer } from "./ConnectorTransformer";
import { Selection } from "./Selection";
import { SelectionItems } from "./SelectionItems";
import { Transformer } from "./Transformer";

export class SelectionTransformer extends Tool {
	private readonly defaultTransformerTool: Transformer;
	private readonly connectorTransformerTool: ConnectorTransformer;

	private tool: Transformer | ConnectorTransformer;

	constructor(
		private board: Board,
		private selection: Selection,
	) {
		super();

		this.defaultTransformerTool = new Transformer(this.board, selection);
		this.connectorTransformerTool = new ConnectorTransformer(
			this.board,
			selection,
		);
		this.tool = this.defaultTransformerTool;

		selection.subject.subscribe(selection => {
			this.handleSelectionUpdate(selection.items);
		});
	}

	handleSelectionUpdate(items: SelectionItems): void {
		const tool = this.tool;
		tool.handleSelectionUpdate(items);
		this.updateTool();
		if (this.tool !== tool) {
			this.tool.handleSelectionUpdate(items);
		}
	}

	updateTool(): void {
		if (this.selection.getContext() === "SelectUnderPointer") {
			return;
		}
		if (this.selection.items.isSingle()) {
			const item = this.selection.items.getSingle();
			if (item?.itemType === "Connector") {
				this.tool = this.connectorTransformerTool;
				return;
			} else {
				this.tool = this.defaultTransformerTool;
				return;
			}
		} else {
			this.tool = this.defaultTransformerTool;
			return;
		}
	}

	getTool(): Transformer | ConnectorTransformer {
		return this.tool;
	}

	leftButtonDown(): boolean {
		return this.tool.leftButtonDown();
	}

	leftButtonUp(): boolean {
		return this.tool.leftButtonUp();
	}

	leftButtonDouble(): boolean {
		return this.tool.leftButtonDouble();
	}

	rightButtonDown(): boolean {
		return this.tool.rightButtonDown();
	}

	rightButtonUp(): boolean {
		return this.tool.rightButtonUp();
	}

	rightButtonDouble(): boolean {
		return this.tool.rightButtonDouble();
	}

	middleButtonDown(): boolean {
		return this.tool.middleButtonDown();
	}

	middleButtonUp(): boolean {
		return this.tool.middleButtonUp();
	}

	middleButtonDouble(): boolean {
		return this.tool.middleButtonDouble();
	}

	keyDown(key: string): boolean {
		return this.tool.keyDown(key);
	}

	keyUp(key: string): boolean {
		return this.tool.keyUp(key);
	}

	pointerMoveBy(x: number, y: number): boolean {
		return this.tool.pointerMoveBy(x, y);
	}

	render(context: DrawingContext): void {
		this.tool.render(context);
	}
}
