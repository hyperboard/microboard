import { type App } from "App";
import { type Board } from "Board";
import { Mbr } from "Board/Items";
import { useAppSubscription } from "Board/useBoardSubscription";
import { useForceUpdate } from "lib/useForceUpdate";
import { useEffect, useState, type RefObject } from "react";
import { updateRects } from "./updateRects";

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
