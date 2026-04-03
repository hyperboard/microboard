import { LinkTo } from 'Items/LinkTo/LinkTo';
import { DefaultRichTextData } from '../RichText/RichTextData';
import { DefaultTransformationData } from 'Geometry/Transformation/TransformationData';
import { ColorValue, semanticColor } from 'Color';

export class StickerData {
	readonly itemType = 'Sticker';
	[key: string]: unknown;
	constructor(
		public backgroundColor: ColorValue = semanticColor('contrastBlue'),
		public transformation = new DefaultTransformationData(),
		public linkTo?: string,
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
