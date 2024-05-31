import { DEFAULT_STICKER_COLOR } from "View/Tools/AddSticker";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { DefaultTransformationData } from "../Transformation/TransformationData";

export interface StickerData {
	readonly itemType: string;
	backgroundColor: string;
	transformation: DefaultTransformationData;
	text: DefaultRichTextData;
}

export class DefaultStickerData implements StickerData {
	readonly itemType = "Sticker";
	constructor(
		public backgroundColor = DEFAULT_STICKER_COLOR,
		public transformation = new DefaultTransformationData(),
		public text = new DefaultRichTextData(),
	) {}
}

interface SetBackgroundColor {
	class: "Sticker";
	method: "setBackgroundColor";
	item: string[];
	backgroundColor: string;
}

export type StickerOperation = SetBackgroundColor;
