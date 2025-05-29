import { Path2DFactory } from "./Path2DFactory";

/**
 * Mock implementation of Path2D for testing purposes.
 * This class provides a non-browser implementation of Path2D that can be used in tests.
 * All methods are stubbed and don't perform actual path operations.
 */
export class MockPath2D implements Path2DFactory {
	public nativePath: any = null;
	private commands: Array<{ method: string; args: any[] }> = [];

	constructor(d?: string) {
		if (d) {
			this.commands.push({ method: "constructor", args: [d] });
		}
	}

	addPath(path: Path2DFactory, transform?: DOMMatrix2DInit): void {
		this.commands.push({ method: "addPath", args: [path, transform] });
	}

	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void {
		this.commands.push({
			method: "arc",
			args: [x, y, radius, startAngle, endAngle, anticlockwise],
		});
	}

	arcTo(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		radius: number,
	): void {
		this.commands.push({
			method: "arcTo",
			args: [x1, y1, x2, y2, radius],
		});
	}

	bezierCurveTo(
		cp1x: number,
		cp1y: number,
		cp2x: number,
		cp2y: number,
		x: number,
		y: number,
	): void {
		this.commands.push({
			method: "bezierCurveTo",
			args: [cp1x, cp1y, cp2x, cp2y, x, y],
		});
	}

	closePath(): void {
		this.commands.push({ method: "closePath", args: [] });
	}

	ellipse(
		x: number,
		y: number,
		radiusX: number,
		radiusY: number,
		rotation: number,
		startAngle: number,
		endAngle: number,
		anticlockwise?: boolean,
	): void {
		this.commands.push({
			method: "ellipse",
			args: [
				x,
				y,
				radiusX,
				radiusY,
				rotation,
				startAngle,
				endAngle,
				anticlockwise,
			],
		});
	}

	lineTo(x: number, y: number): void {
		this.commands.push({ method: "lineTo", args: [x, y] });
	}

	moveTo(x: number, y: number): void {
		this.commands.push({ method: "moveTo", args: [x, y] });
	}

	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
		this.commands.push({
			method: "quadraticCurveTo",
			args: [cpx, cpy, x, y],
		});
	}

	rect(x: number, y: number, w: number, h: number): void {
		this.commands.push({ method: "rect", args: [x, y, w, h] });
	}

	roundRect(
		x: number,
		y: number,
		width: number,
		height: number,
		radii?: number | DOMPointInit,
	): void {
		this.commands.push({
			method: "roundRect",
			args: [x, y, width, height, radii],
		});
	}

	/**
	 * Get all commands that were called on this path
	 * Useful for testing to verify the sequence of operations
	 */
	getCommands(): Array<{ method: string; args: any[] }> {
		return [...this.commands];
	}

	/**
	 * Clear all recorded commands
	 * Useful for resetting the mock between tests
	 */
	clearCommands(): void {
		this.commands = [];
	}

	/**
	 * Check if a specific command was called with specific arguments
	 * @param method - The method name to check
	 * @param args - Optional arguments to verify
	 */
	wasCalledWith(method: string, args?: any[]): boolean {
		return this.commands.some(cmd => {
			if (cmd.method !== method) return false;
			if (!args) return true;
			return args.every((arg, i) => cmd.args[i] === arg);
		});
	}

	/**
	 * Get the number of times a specific command was called
	 * @param method - The method name to count
	 */
	getCallCount(method: string): number {
		return this.commands.filter(cmd => cmd.method === method).length;
	}
}
