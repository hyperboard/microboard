import { getRandomNumber } from "Board/lib";

export function getRandomRgba(
	min: number,
	max: number,
	alphaMin: number,
	alphaMax: number,
): string {
	const red = Math.floor(getRandomNumber(min, max));
	const green = Math.floor(getRandomNumber(min, max));
	const blue = Math.floor(getRandomNumber(min, max));
	const alpha = getRandomNumber(alphaMin, alphaMax);
	return `rgba(${red},${green},${blue},${alpha})`;
}
