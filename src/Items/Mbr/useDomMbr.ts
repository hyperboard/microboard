import { type App } from "App";
import { type RefObject, useState, useLayoutEffect } from "react";
import { type Board } from "Board";
import { Mbr } from "Board/Items";
import { useAppSubscription } from "Board/useBoardSubscription";
import { updateRects } from "./updateRects";
import { useForceUpdate } from "lib/useForceUpdate";

type Params = {
	app: App;
	board: Board;
	ref: RefObject<HTMLElement>;
	subjects?: string[];
};

export function useDomMbr({
	app,
	board,
	ref,
	subjects = ["camera", "selection", "selectionItems", "selectionItem"],
}: Params) {
	const [mbr, setMbr] = useState(new Mbr());
	const forceUpdate = useForceUpdate();
	useAppSubscription(app, {
		subjects,
		observer: () => {
			const newMbr = updateRects(board, ref);
			if (newMbr) {
				setMbr(newMbr);
			}
			forceUpdate();
		},
	});
	return mbr;
}
