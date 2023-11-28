export class Layers<Layer> {
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
