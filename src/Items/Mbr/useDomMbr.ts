import { type App } from "App";
import { type RefObject, useState, useLayoutEffect, useEffect } from "react";
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
	subjects = ["camera", "selection"],
}: Params) {
	const [mbr, setMbr] = useState(new Mbr());
	const forceUpdate = useForceUpdate();
	useAppSubscription(app, {
		subjects,
		observer: () => {
			const newMbr = updateRects(board, ref);
			if (newMbr && !newMbr?.isEqual(mbr)) {
				setMbr(newMbr);
			}
			forceUpdate();
		},
	});
	useEffect(() => {
		const newMbr = updateRects(board, ref);
		if (newMbr && !newMbr?.isEqual(mbr)) {
			setMbr(newMbr);
		}
	});
	return mbr;
}
