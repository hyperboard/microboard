import { Command, Operation } from 'Events';
import { ImageItem } from './Image';

export class ImageCommand implements Command {
	constructor(private images: ImageItem[], private operation: Operation) {}

	apply(): void {
		for (const image of this.images) {
			image.apply(this.operation);
		}
	}

	revert(): void {}
}
