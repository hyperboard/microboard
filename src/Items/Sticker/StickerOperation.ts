import { RichTextData } from "../RichText";
import { TransformationData } from "../Transformation";

export class StickerData {
	readonly itemType = "Sticker";
	constructor(
		public backgroundColor = "",
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

export type StickerOperation =
	| SetBackgroundColor;
