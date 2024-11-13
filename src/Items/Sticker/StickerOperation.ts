import { stickerColors } from ".";
import { DefaultRichTextData } from "../RichText/RichTextData";
import { DefaultTransformationData } from "../Transformation/TransformationData";
import { LinkTo } from "../LinkTo/LinkTo";

export class StickerData {
	readonly itemType = "Sticker";
	constructor(
		public backgroundColor = stickerColors["Sky Blue"],
		public transformation = new DefaultTransformationData(),
		public linkTo: LinkTo = new LinkTo(),
		public text = new DefaultRichTextData([], "center", undefined),
	) {}
}

interface SetBackgroundColor {
	class: "Sticker";
	method: "setBackgroundColor";
	item: string[];
	backgroundColor: string;
}

export type StickerOperation = SetBackgroundColor;
