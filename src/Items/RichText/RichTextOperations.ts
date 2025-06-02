import { BaseSelection, Operation } from 'slate';
import { HorisontalAlignment, VerticalAlignment } from '../Alignment';
import { TextStyle } from './Editor/TextNode';
import { SelectionContext } from 'Selection/Selection';

interface RichTextBaseOp {
	class: 'RichText';
	item: string[];
}

interface SetFontColor extends RichTextBaseOp {
	method: 'setFontColor';
	fontColor: string;
}

interface SetFontStyle extends RichTextBaseOp {
	method: 'setFontStyle';
	fontStyleList: TextStyle[];
}

interface SetFontFamily extends RichTextBaseOp {
	method: 'setFontFamily';
	fontFamily: string;
}

interface SetFontSize extends RichTextBaseOp {
	method: 'setFontSize';
	fontSize: number | 'auto';
	context?: SelectionContext;
}

interface SetFontHighlight extends RichTextBaseOp {
	method: 'setFontHighlight';
	fontHighlight: string;
}

interface SetHorisontalAligment extends RichTextBaseOp {
	method: 'setHorisontalAlignment';
	horisontalAlignment: HorisontalAlignment;
}

interface SetVerticalAlignment extends RichTextBaseOp {
	method: 'setVerticalAlignment';
	verticalAlignment: VerticalAlignment;
}

interface SetMaxWidth extends RichTextBaseOp {
	method: 'setMaxWidth';
	maxWidth: number | undefined;
}

export type SelectionMethod =
	| 'setSelectionHorizontalAlignment'
	| 'setSelectionFontHighlight'
	| 'setSelectionFontSize'
	| 'setSelectionFontFamily'
	| 'setSelectionFontStyle'
	| 'setSelectionFontColor'
	| 'setSelectionBlockType'
	| 'edit';

export interface SelectionOp extends RichTextBaseOp {
	method: SelectionMethod;
	selection: BaseSelection;
	ops: Operation[];
}

export type WholeTextOp =
	| SetFontColor
	| SetFontStyle
	| SetFontFamily
	| SetFontSize
	| SetFontHighlight
	| SetHorisontalAligment
	| SetVerticalAlignment
	| SetMaxWidth;
// | AddFontStyle
// | RemoveFontStyle;

export type WholeTextMethod = WholeTextOp['method'];

export interface ItemOp {
	item: string;
	selection: BaseSelection;
	ops: Operation[];
}
export interface GroupEdit {
	class: 'RichText';
	method: 'groupEdit';
	itemsOps: ItemOp[];
}

export type RichTextOperation = WholeTextOp | SelectionOp | GroupEdit;
