import { Tool } from "Board/Tools/Tool";
import { DrawingContext } from "Board/Items/DrawingContext";
import { SelectionItems } from "Board/Selection/SelectionItems";
import { Selection } from "Board/Selection";

export class ItemsHighlighter extends Tool {
	constructor(private selection: Selection) {
		super();
		selection.subject.subscribe(() => {});
	}

	render(_context: DrawingContext): void {}

	handleSelectionUpdate(_items: SelectionItems): void {
		// do nothing
	}
}
