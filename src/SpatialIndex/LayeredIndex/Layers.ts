export class Layers<Layer> {
	array: Layer[] = [];
	private top = 0;
	private bottom = 0;

	constructor(private getNewLayer: () => Layer) {
		this.array.push(this.getNewLayer());
	}

	newOnTop(): void {
		this.array.push(this.getNewLayer());
		this.top++;
	}

	newOnBottom(): void {
		this.array.unshift(this.getNewLayer());
		this.bottom--;
	}

	getTop(): number {
		return this.top;
	}

	getBottom(): number {
		return this.bottom;
	}

	get(number: number): Layer | undefined {
		const idx = number - this.bottom;
		if (idx >= 0 && idx < this.array.length) {
			return this.array[idx];
		}
		return undefined;
	}

	[Symbol.iterator](): Iterator<Layer> {
		let index = 0;
		return {
			next: (): IteratorResult<Layer> => {
				if (index < this.array.length) {
					return {
						value: this.array[index++],
						done: false,
					};
				} else {
					return {
						value: undefined as unknown as Layer,
						done: true,
					};
				}
			},
		};
	}
}

export class MapLayers<Layer> {
	private layers: Map<number, Layer> = new Map();
	private top = 0;
	private bottom = 0;

	constructor(private getNewLayer: () => Layer) {
		this.layers.set(this.top, this.getNewLayer());
	}

	newOnTop(): void {
		this.top++;
		this.layers.set(this.top, this.getNewLayer());
	}

	newOnBottom(): void {
		this.bottom--;
		this.layers.set(this.bottom, this.getNewLayer());
	}

	getTop(): number {
		return this.top;
	}

	getBottom(): number {
		return this.bottom;
	}

	get(number: number): Layer | undefined {
		return this.layers.get(number);
	}

	[Symbol.iterator](): Iterator<Layer> {
		let index = this.bottom;
		return {
			next: () => {
				const value = this.layers.get(index);
				index++;
				if (value !== undefined) {
					const result = {
						value,
						done: false,
					};

					return result;
				} else {
					return {
						value: value as unknown as Layer,
						done: true,
					};
				}
			},
		};
	}
}
