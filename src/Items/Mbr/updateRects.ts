import { Board } from "Board";
import { Mbr, RichText } from "Board/Items";
import { RefObject } from "react";
import { fitContextPanel, fitTR } from "View/fit";

export function updateRects(
	board: Board,
	ref: RefObject<HTMLElement>,
	mbr?: Mbr,
	verticalOffset?: number,
	horizontalOffset?: number,
	fit: "contextPanel" | "linkToBtn" = "contextPanel",
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
		if (fit === "contextPanel") {
			const panelRect = fitContextPanel(
				selectionMbr.getTransformed(camera.getMatrix()),
				camera.window.getMbr(),
				Mbr.fromDomRect(panel.getBoundingClientRect()),
				verticalOffset,
				horizontalOffset,
				richTextSelection,
			);
			return panelRect;
		}
		if (fit === "linkToBtn") {
			if (!mbr) {
				return null;
			}
			const panelRect = fitTR(
				selectionMbr.getTransformed(camera.getMatrix()),
				camera.window.getMbr(),
				Mbr.fromDomRect(panel.getBoundingClientRect()),
				verticalOffset,
				horizontalOffset,
			);
			return panelRect;
		}
	}
	return null;
}
