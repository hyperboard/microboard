import { LinkTo } from 'Items/LinkTo/LinkTo';
import { DefaultRichTextData } from '../RichText/RichTextData';
import { DefaultTransformationData } from '../Transformation/TransformationData';
import { ColorValue, semanticColor } from 'Color';

export class StickerData {
	readonly itemType = 'Sticker';
	constructor(
		public backgroundColor: ColorValue = semanticColor('contrastBlue'),
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
