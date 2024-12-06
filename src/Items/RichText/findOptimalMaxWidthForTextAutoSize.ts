import { BlockNode } from "./Editor/BlockNode";
import { getBlockNodes } from "./RichTextCanvasRenderer";

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
	let didFound = false;

	let closestRatioDifference = Infinity;
	let closestWidth = initialMaxWidth;
	let closestHeight = initialMaxWidth / targetRatio;

	for (let i = 0; i < 10 && low < high; i += 1) {
		const mid = (low + high) / 2;
		const { width: calcWidth, height: calcHeight } = getBlockNodes(
			text,
			mid,
		);

		const currentRatio = calcWidth / calcHeight;
		const ratioDifference = Math.abs(currentRatio - targetRatio);

		if (ratioDifference < closestRatioDifference) {
			closestRatioDifference = ratioDifference;
			closestWidth = calcWidth;
			closestHeight = calcHeight;
		}

		if (ratioDifference <= tolerance) {
			bestMaxWidth = mid;
			bestMaxHeight = calcHeight;
			didFound = true;
			break;
		}

		if (currentRatio < targetRatio) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	if (!didFound) {
		const scale = Math.min(
			containerWidth / closestWidth,
			containerHeight / closestHeight,
		);
		return {
			bestMaxWidth: initialMaxWidth / scale,
			bestMaxHeight: initialMaxWidth / targetRatio / scale,
		};
	}

	return { bestMaxWidth, bestMaxHeight };
}
