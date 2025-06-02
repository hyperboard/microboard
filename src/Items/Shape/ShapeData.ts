import { conf } from 'Settings';
import { BorderStyle, BorderWidth } from '../Path';
import { RichTextData } from '../RichText';
import { DefaultRichTextData } from '../RichText/RichTextData';
import { TransformationData, DefaultTransformationData } from '../Transformation';
import { ShapeType } from './index';

export interface ShapeData {
	readonly itemType: 'Shape';
	shapeType: ShapeType;
	backgroundColor: string;
	backgroundOpacity: number;
	borderColor: string;
	borderOpacity: number;
	borderStyle: BorderStyle;
	borderWidth: BorderWidth;
	transformation: TransformationData;
	text: RichTextData;
	linkTo?: string;
}

export class DefaultShapeData implements ShapeData {
	readonly itemType = 'Shape';
	constructor(
		public shapeType: ShapeType = 'Rectangle',
		public backgroundColor = 'none',
		public backgroundOpacity = 1,
		public borderColor = conf.SHAPE_DEFAULT_STROKE_COLOR,
		public borderOpacity = 1,
		public borderStyle: BorderStyle = 'solid',
		public borderWidth: BorderWidth = 1,
		public transformation = new DefaultTransformationData(),
		public text = new DefaultRichTextData(),
		public linkTo?: string
	) {}
}

export const ADD_TO_SELECTION = true;
export const DEFAULT_SHAPE: ShapeType | 'None' = 'Rectangle';
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 12;
export const STEP_STROKE_WIDTH = 1;
export const SHAPE_LAST_TYPE_KEY = 'lastShapeType';

export const BASIC_SHAPES = [
	'Rectangle',
	'RoundedRectangle',
	'Circle',
	'Triangle',
	'Rhombus',
	'SpeachBubble',
	'ArrowRight',
	'ArrowLeft',
	'Cloud',
	'Parallelogram',
	'Star',
	'BracesRight',
	'BracesLeft',
	'ArrowLeftRight',
	'Cross',
	'Cylinder',
	'Trapezoid',
	'PredefinedProcess',
	'Octagon',
	'Hexagon',
	'Pentagon',
] as const;

export const BPMN_SHAPES = [
	'BPMN_Gateway',
	'BPMN_DataStore',
	'BPMN_GatewayParallel',
	'BPMN_GatewayXOR',
	'BPMN_EndEvent',
	'BPMN_StartEvent',
	'BPMN_StartEventNoneInterrupting',
	'BPMN_IntermediateEvent',
	'BPMN_IntermediateEventNoneInterrupting',
	'BPMN_Group',
	'BPMN_Participant',
	'BPMN_Task',
	'BPMN_Transaction',
	'BPMN_EventSubprocess',
	'BPMN_Annotation',
	'BPMN_DataObject',
];

export const SHAPES_CATEGORIES = [
	{
		name: 'basicShapes',
		shapes: BASIC_SHAPES,
	},
	{
		name: 'BPMN',
		shapes: BPMN_SHAPES,
	},
] as const;

export type ShapeCategoryName = (typeof SHAPES_CATEGORIES)[number]['name'];
