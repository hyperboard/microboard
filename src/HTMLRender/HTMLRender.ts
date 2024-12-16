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
): void {
	const [translateX, translateY] = getTranslationFromHTML(toPosition);
	const [frameX, frameY] = getTranslationFromHTML(positionBy);
	const [dx, dy] = [translateX - frameX, translateY - frameY];

	const [scaleX, scaleY] = getScaleFromHTML(toPosition);
	toPosition.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
}
