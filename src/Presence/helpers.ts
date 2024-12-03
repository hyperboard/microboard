// Catmull-Rom spline interpolation function
export const catmullRomInterpolate = (
	point0: { x: number; y: number },
	point1: { x: number; y: number },
	point2: { x: number; y: number },
	point3: { x: number; y: number },
	time: number,
): { x: number; y: number } => {
	const timeSquared = time * time;
	const timeCubed = time * time * time;

	const coefficientX1 = 2 * point1.x - 2 * point2.x + point0.x + point3.x;
	const coefficientX2 = -3 * point1.x + 3 * point2.x - point0.x - point3.x;
	const coefficientX3 = point0.x;
	const coefficientX4 = point1.x;

	const interpolatedX =
		coefficientX1 * timeCubed +
		coefficientX2 * timeSquared +
		coefficientX3 * time +
		coefficientX4;

	const coefficientY1 = 2 * point1.y - 2 * point2.y + point0.y + point3.y;
	const coefficientY2 = -3 * point1.y + 3 * point2.y - point0.y - point3.y;
	const coefficientY3 = point0.y;
	const coefficientY4 = point1.y;

	const interpolatedY =
		coefficientY1 * timeCubed +
		coefficientY2 * timeSquared +
		coefficientY3 * time +
		coefficientY4;

	return { x: interpolatedX, y: interpolatedY };
};

export const rgbToRgba = (rgb: string, opacity: number): string => {
	const match = rgb.match(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
	if (!match) {
		// throw new Error("Invalid RGB format. Expected format: 'rgb(r, g, b)'");
		return rgb;
	}
	const [_, red, green, blue] = match;
	const clampedOpacity = Math.max(0, Math.min(1, opacity));
	return `rgba(${red}, ${green}, ${blue}, ${clampedOpacity})`;
};
