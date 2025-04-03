import { getBlockNodes } from "./CanvasText/Render.ts";
import { BlockNode } from "./Editor/BlockNode";

/*
Вот 10 слов из 10 букв (не правда):

1. Автомобиль
2. Библиотека
3. Велосипед
4. Гимнастика
5. Дисциплина
6. Жонглировать
7. Интеллект
8. Концепция
9. Лаборатория
10. Мотивация

Вот 10 слов из 17 букв (не правда):

1. Благотворительность
2. Водонепроницаемость
3. Гастроэнтерология
4. Дезориентированный
5. Землепользователь
6. Интернационализм
7. Кораблестроитель
8. Малоинформативный
9. Невосприимчивость
10. Осведомительница

*/
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
	let high = initialMaxWidth * 3;

	let closestRatioDifference = Infinity;
	let closestWidth = initialMaxWidth;
	let closestHeight = initialMaxWidth / targetRatio;
	const iterations = Math.min(Math.max(3, containerWidth / 80), 15);

	for (let i = 0; i < iterations && low < high; i += 1) {
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
			break;
		}

		if (currentRatio < targetRatio) {
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}

	const scale = Math.min(
		containerWidth / closestWidth,
		containerHeight / closestHeight,
	);
	return {
		bestMaxWidth: initialMaxWidth / scale,
		bestMaxHeight: initialMaxWidth / targetRatio / scale,
	};
}
