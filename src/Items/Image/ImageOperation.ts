import { ImageConstructorData } from "./Image";

interface ImageBaseOp {
	class: "Image";
	item: string[];
}

interface UpdateImageData extends ImageBaseOp {
	method: "updateImageData";
	data: ImageConstructorData;
}

export type ImageOperation = UpdateImageData;
