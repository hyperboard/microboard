import { RichTextData } from "../RichText";
import { TransformationData } from "../Transformation";
import {stickerColors} from "../../../View/Pickers/StickerPicker";

export class StickerData {
	readonly itemType = "Sticker";
	constructor(
		public backgroundColor = stickerColors.blue,
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
