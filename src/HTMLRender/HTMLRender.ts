export function getTranslationFromHTML(el: HTMLElement): [number, number] {
	const transform = el.style.transform;
	const translateMatch = transform.match(/translate\(([^)]+)\)/);
	const [translateX, translateY] = translateMatch
		? translateMatch[1].split(",").map(value => parseFloat(value))
		: [0, 0];

	return [translateX, translateY];
}

export function getScaleFromHTML(el: HTMLElement): [number, number] {
	const transform = el.style.transform;
	const scaleMatch = transform.match(/scale\(([^)]+)\)/);
	const [scaleX, scaleY] = scaleMatch
		? scaleMatch[1].split(",").map(value => parseFloat(value))
		: [1, 1];

	return [scaleX, scaleY];
}

export function translateElementBy(
	el: HTMLElement,
	x: number,
	y: number,
): HTMLElement {
	const [exX, exY] = getTranslationFromHTML(el);
	const [newX, newY] = [exX + x, exY + y];

	const [scaleX, scaleY] = getScaleFromHTML(el);
	el.style.transform = `translate(${newX}px, ${newY}px) scale(${scaleX}, ${scaleY})`;

	return el;
}

export function scaleElementBy(
	el: HTMLElement,
	scaleX: number,
	scaleY: number,
): HTMLElement {
	const [currentScaleX, currentScaleY] = getScaleFromHTML(el);
	const [newScaleX, newScaleY] = [
		currentScaleX * scaleX,
		currentScaleY * scaleY,
	];

	const [translateX, translateY] = getTranslationFromHTML(el);
	el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${newScaleX}, ${newScaleY})`;

	return el;
}

export function resetElementScale(el: HTMLElement): HTMLElement {
	const [x, y] = getTranslationFromHTML(el);

	el.style.transform = `translate(${x}px, ${y}px) scale(1, 1)`;
	return el;
}

export function positionRelatively(
	toPosition: HTMLElement,
	positionBy: HTMLElement,
	padding = 0,
): HTMLElement {
	const [translateX, translateY] = getTranslationFromHTML(toPosition);
	const [frameX, frameY] = getTranslationFromHTML(positionBy);
	const [dx, dy] = [translateX - frameX, translateY - frameY];
	const verticalAlignment = toPosition.getAttribute(
		"data-vertical-alignment",
	);
	const horizontalAlignment = toPosition.getAttribute(
		"data-vertical-alignment",
	);
	let paddingX = padding;
	let paddingY = padding;
	if (verticalAlignment && verticalAlignment === "bottom") {
		paddingY = -padding;
	}
	if (horizontalAlignment && horizontalAlignment === "right") {
		paddingX = -padding;
	}

	const [scaleX, scaleY] = getScaleFromHTML(toPosition);
	toPosition.style.transform = `translate(${dx + paddingX}px, ${dy + paddingY}px) scale(${scaleX}, ${scaleY})`;

	return toPosition;
}

export function positionAbsolutely(
	toPosition: HTMLElement,
	positionBy: HTMLElement,
): HTMLElement {
	const [translateX, translateY] = getTranslationFromHTML(toPosition);
	const [frameX, frameY] = getTranslationFromHTML(positionBy);
	const [dx, dy] = [translateX + frameX, translateY + frameY];

	const [scaleX, scaleY] = getScaleFromHTML(toPosition);
	toPosition.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;

	return toPosition;
}

// export function scaleRelatively(
// 	toScale: HTMLElement,
// 	scaleBy: HTMLElement,
// ): void {
// 	const [currentScaleX, currentScaleY] = getScaleFromHTML(toScale);
// 	const [referenceScaleX, referenceScaleY] = getScaleFromHTML(scaleBy);
// 	const [newScaleX, newScaleY] = [
// 		currentScaleX / referenceScaleX,
// 		currentScaleY / referenceScaleY,
// 	];

// 	const [translateX, translateY] = getTranslationFromHTML(toScale);
// 	toScale.style.transform = `translate(${translateX * newScaleX}px, ${translateY * newScaleY}px) scale(${newScaleX}, ${newScaleY})`;
// }
