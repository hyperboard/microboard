import { Board } from "Board";
import { Mbr, RichText } from "Board/Items";
import { RefObject } from "react";
import {
	fitBoardMenu,
	fitComment,
	fitContextPanel,
	fitLinkToBtn,
	fitThreadPanel,
} from "View/fit";

export function updateRects(
	board: Board,
	ref: RefObject<HTMLElement>,
	mbr?: Mbr,
	verticalOffset?: number,
	horizontalOffset?: number,
	fit:
		| "boardMenu"
		| "contextPanel"
		| "linkToBtn"
		| "comment"
		| "threadPanel" = "contextPanel",
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
			const panelRect = fitLinkToBtn(
				selectionMbr.getTransformed(camera.getMatrix()),
				camera.window.getMbr(),
				Mbr.fromDomRect(panel.getBoundingClientRect()),
				verticalOffset,
				horizontalOffset,
			);
			return panelRect;
		}
		if (fit === "comment") {
			if (!mbr) {
				return null;
			}
			const panelRect = fitComment(
				selectionMbr.getTransformed(camera.getMatrix()),
				Mbr.fromDomRect(panel.getBoundingClientRect()),
				verticalOffset,
				horizontalOffset,
			);
			return panelRect;
		}
		if (fit === "threadPanel") {
			if (!mbr) {
				return null;
			}
			const panelRect = fitThreadPanel(
				selectionMbr.getTransformed(camera.getMatrix()),
				camera.window.getMbr(),
				Mbr.fromDomRect(panel.getBoundingClientRect()),
				verticalOffset,
				horizontalOffset,
			);
			return panelRect;
		}
		if (fit === "boardMenu") {
			if (!mbr) {
				return null;
			}
			const panelRect = fitBoardMenu(
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
