import { getBlockNodes } from "./CanvasText/Render";
import { BlockNode } from "./Editor/BlockNode";

export function findOptimalMaxWidthForTextAutoSize(
	text: BlockNode[],
	containerWidth: number,
	containerHeight: number,
	initialMaxWidth: number,
	tolerance = 0.05,
): {
	bestMaxWidth: number;
	bestMaxHeight: number;
} {
	const targetRatio = containerWidth / containerHeight;
	let low = 0;
	let high = initialMaxWidth * 10;

	let bestMaxWidth = initialMaxWidth;
	let bestMaxHeight = initialMaxWidth / targetRatio;
	let didFoundWithinTolerance = false;

	let closestRatioDifference = Infinity;
	let closestNonBreakingWidth = initialMaxWidth;
	let closestNonBreakingHeight = initialMaxWidth / targetRatio;
	let foundNonBreakingValue = false;

	for (let i = 0; i < 10 && low < high; i += 1) {
		const mid = (low + high) / 2;
		const {
			width: calcWidth,
			height: calcHeight,
			didBreakWords,
		} = getBlockNodes(text, mid);

		const currentRatio = calcWidth / calcHeight;
		const ratioDifference = Math.abs(currentRatio - targetRatio);

		if (!didBreakWords) {
			foundNonBreakingValue = true;
			if (ratioDifference < closestRatioDifference) {
				closestRatioDifference = ratioDifference;
				closestNonBreakingWidth = calcWidth;
				closestNonBreakingHeight = calcHeight;
			}
		}

		if (ratioDifference <= tolerance && !didBreakWords) {
			bestMaxWidth = calcWidth;
			bestMaxHeight = calcHeight;
			didFoundWithinTolerance = true;
			break;
		}

		if (currentRatio < targetRatio) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	if (didFoundWithinTolerance) {
		return { bestMaxWidth, bestMaxHeight };
	}

	if (foundNonBreakingValue) {
		return {
			bestMaxWidth: closestNonBreakingWidth,
			bestMaxHeight: closestNonBreakingHeight,
		};
	}

	// If we didn't find any non-breaking values, use scale with initial max width
	const scale = Math.min(
		containerWidth / initialMaxWidth,
		containerHeight / (initialMaxWidth / targetRatio),
	);
	return {
		bestMaxWidth: initialMaxWidth / scale,
		bestMaxHeight: initialMaxWidth / targetRatio / scale,
	};
}
