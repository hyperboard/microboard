export interface Path2DFactory {
	/**
	 * Adds the given path to the current path, optionally applying a transformation.
	 * @param path - The Path2D to add.
	 * @param transform - An optional transformation matrix.
	 */
	addPath(path: Path2DFactory, transform?: DOMMatrix2DInit): void;

	/**
	 * Adds an arc to the path.
	 * @param x - The x-coordinate of the center of the arc.
	 * @param y - The y-coordinate of the center of the arc.
	 * @param radius - The radius of the arc.
	 * @param startAngle - The starting angle, in radians.
	 * @param endAngle - The ending angle, in radians.
	 * @param anticlockwise - Optional. If true, draws the arc anticlockwise; otherwise, clockwise.
	 */
	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void;

	/**
	 * Adds an arc segment to the path with the given control points and radius.
	 * @param x1 - The x-coordinate of the first control point.
	 * @param y1 - The y-coordinate of the first control point.
	 * @param x2 - The x-coordinate of the second control point.
	 * @param y2 - The y-coordinate of the second control point.
	 * @param radius - The radius of the arc.
	 */
	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;

	/**
	 * Adds a Bézier curve to the path.
	 * @param cp1x - The x-coordinate of the first control point.
	 * @param cp1y - The y-coordinate of the first control point.
	 * @param cp2x - The x-coordinate of the second control point.
	 * @param cp2y - The y-coordinate of the second control point.
	 * @param x - The x-coordinate of the end point.
	 * @param y - The y-coordinate of the end point.
	 */
	bezierCurveTo(
		cp1x: number,
		cp1y: number,
		cp2x: number,
		cp2y: number,
		x: number,
		y: number,
	): void;

	/**
	 * Closes the current subpath.
	 */
	closePath(): void;

	/**
	 * Adds an ellipse to the path.
	 * @param x - The x-coordinate of the center of the ellipse.
	 * @param y - The y-coordinate of the center of the ellipse.
	 * @param radiusX - The ellipse's major-axis radius.
	 * @param radiusY - The ellipse's minor-axis radius.
	 * @param rotation - The rotation of the ellipse, in radians.
	 * @param startAngle - The starting angle, in radians.
	 * @param endAngle - The ending angle, in radians.
	 * @param anticlockwise - Optional. If true, draws the ellipse anticlockwise; otherwise, clockwise.
	 */
	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void;

	/**
	 * Adds a straight line to the path.
	 * @param x - The x-coordinate of the end point.
	 * @param y - The y-coordinate of the end point.
	 */
	lineTo(x: number, y: number): void;

	/**
	 * Moves the starting point of a new subpath to the specified (x, y) coordinates.
	 * @param x - The x-coordinate.
	 * @param y - The y-coordinate.
	 */
	moveTo(x: number, y: number): void;

	/**
	 * Adds a quadratic Bézier curve to the path.
	 * @param cpx - The x-coordinate of the control point.
	 * @param cpy - The y-coordinate of the control point.
	 * @param x - The x-coordinate of the end point.
	 * @param y - The y-coordinate of the end point.
	 */
	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;

	/**
	 * Adds a rectangle to the path.
	 * @param x - The x-coordinate of the rectangle's starting point.
	 * @param y - The y-coordinate of the rectangle's starting point.
	 * @param w - The width of the rectangle.
	 * @param h - The height of the rectangle.
	 */
	rect(x: number, y: number, w: number, h: number): void;
}
