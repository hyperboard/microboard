import { ImageItem, ImageConstructorData } from "./Image";
import { ImageOperation } from "./ImageOperation";

export const imageOps = {
	updateImageData: (items: ImageItem[], data: ImageConstructorData): ImageOperation => ({
		class: "Image",
		method: "updateImageData",
		item: items.map(i => i.getId()),
		data,
	}),
};
