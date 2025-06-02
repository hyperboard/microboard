import { Descendant } from 'slate';
import { VerticalAlignment } from '../Alignment';
import { TransformationData } from '../Transformation/TransformationData';
import { ItemType } from '../Item';

export interface RichTextData {
	readonly itemType: 'RichText';
	children: Descendant[];
	verticalAlignment: VerticalAlignment;
	maxWidth?: number;
	transformation?: TransformationData;
	containerMaxWidth?: number;
	insideOf?: ItemType;
	color?: string;
	placeholderText: string;
	realSize: 'auto' | number;
	linkTo?: string;
}

export class DefaultRichTextData implements RichTextData {
	readonly itemType = 'RichText';
	constructor(
		public children: Descendant[] = [],
		public verticalAlignment: VerticalAlignment = 'center',
		public maxWidth?: number,
		public transformation?: TransformationData,
		public linkTo?: string,
		public containerMaxWidth?: number,
		public insideOf?: ItemType,
		public color?: string,
		public placeholderText = '',
		public realSize: 'auto' | number = 14
	) {}
}
