import { LinkTo } from 'Items/LinkTo/LinkTo';
import { stickerColors } from '.';
import { DefaultRichTextData } from '../RichText/RichTextData';
import { DefaultTransformationData } from '../Transformation/TransformationData';
import { ColorValue, fixedColor } from 'Color';

export class StickerData {
	readonly itemType = 'Sticker';
	constructor(
		public backgroundColor: ColorValue = fixedColor(stickerColors['Sky Blue']),
		public transformation = new DefaultTransformationData(),
		public linkTo?: string | LinkTo,
		public text = new DefaultRichTextData([], 'center', undefined)
	) {}
}

interface SetBackgroundColor {
	class: 'Sticker';
	method: 'setBackgroundColor';
	item: string[];
	backgroundColor: ColorValue;
}

export type StickerOperation = SetBackgroundColor;
