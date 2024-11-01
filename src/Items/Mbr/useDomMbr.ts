import { type App } from "App";
import { type Board } from "Board";
import { Mbr } from "Board/Items";
import { useAppSubscription } from "Board/useBoardSubscription";
import { useForceUpdate } from "lib/useForceUpdate";
import { useEffect, useState, type RefObject, useRef } from "react";
import { updateRects } from "./updateRects";
import { SubjectName } from "App/getSubscriptions";

type Params = {
	app: App;
	board: Board;
	ref: RefObject<HTMLElement>;
	subjects?: SubjectName[];
	targetMbr?: Mbr;
	verticalOffset?: number;
	horizontalOffset?: number;
	fit?: "contextPanel" | "linkToBtn";
};

export function useDomMbr({
	app,
	board,
	ref,
	subjects = ["camera", "selection"],
	targetMbr,
	horizontalOffset,
	verticalOffset,
	fit = "contextPanel",
}: Params) {
	const [mbr, setMbr] = useState(new Mbr());
	const forceUpdate = useForceUpdate();
	const isMounted = useRef(true);

	useAppSubscription(app, {
		subjects,
		observer: () => {
			if (isMounted.current) {
				forceUpdate();
			}
		},
	});
	useEffect(() => {
		isMounted.current = true;
		const newMbr = updateRects(
			board,
			ref,
			targetMbr,
			verticalOffset,
			horizontalOffset,
			fit,
		);
		if (newMbr && !newMbr?.isEqual(mbr)) {
			setMbr(newMbr);
		}
		return () => {
			isMounted.current = false;
		};
	});
	return mbr;
}
