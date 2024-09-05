import { Board } from "Board";
import { Mbr, RichText } from "Board/Items";
import { RefObject } from "react";
import { fitContextPanel } from "View/fit";

export function updateRects(
	board: Board,
	ref: RefObject<HTMLElement>,
	mbr?: Mbr,
	offset?: number,
): Mbr | null {
	const { selection, camera } = board;
	const panel = ref.current;
	const selectionMbr = mbr ?? selection.getMbr();
	const selectionItems = selection.items;
	const richTextSelection =
		selectionItems.isSingle() &&
		selectionItems.getSingle() instanceof RichText
			? (selectionItems.list()[0] as RichText)
			: undefined;

	if (panel && selectionMbr) {
		const panelRect = fitContextPanel(
			selectionMbr.getTransformed(camera.getMatrix()),
			camera.window.getMbr(),
			Mbr.fromDomRect(panel.getBoundingClientRect()),
			offset,
			richTextSelection,
		);
		return panelRect;
	}
	return null;
}
