import { Board } from "Board";
import { Mbr } from "Board/Items";
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
	if (panel && selectionMbr) {
		const panelRect = fitContextPanel(
			selectionMbr.getTransformed(camera.getMatrix()),
			camera.window.getMbr(),
			Mbr.fromDomRect(panel.getBoundingClientRect()),
			offset,
		);
		return panelRect;
	}
	return null;
}
