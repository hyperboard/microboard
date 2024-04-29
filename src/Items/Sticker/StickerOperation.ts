import { RichTextData } from "../RichText";
import { TransformationData } from "../Transformation";
import { stickerColors } from ".";

export class StickerData {
	readonly itemType = "Sticker";
	constructor(
		public backgroundColor = stickerColors["Sky Blue"],
		public transformation = new TransformationData(),
		public text = new RichTextData(),
	) {}
}

interface SetBackgroundColor {
	class: "Sticker";
	method: "setBackgroundColor";
	item: string[];
	backgroundColor: string;
}

export type StickerOperation = SetBackgroundColor;
