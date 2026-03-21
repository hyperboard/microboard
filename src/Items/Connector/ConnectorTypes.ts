import { BorderStyle } from "../Path";

export const ConnectorLineStyles = ['straight', 'curved', 'orthogonal'] as const;
export type ConnectorLineStyle = (typeof ConnectorLineStyles)[number];

export const ConnectionLineWidths = [1, 2, 3, 4, 5, 6, 7, 8, 12] as const;
export type ConnectionLineWidth = (typeof ConnectionLineWidths)[number];

export const CONNECTOR_COLOR = 'rgb(20, 21, 26)';
export const CONNECTOR_LINE_WIDTH = 1;
export const CONNECTOR_BORDER_STYLE: BorderStyle = 'solid';
export const DEFAULT_END_POINTER = 'TriangleFilled';

export const CONNECTOR_POINTER_TYPES = [
	'None',
	'ArrowThin',
	'ArrowHeavy',
	'TriangleFilled',
	'TriangleOutline',
	'CircleFilled',
	'CircleOutline',
	'DiamondFilled',
	'DiamondOutline',
] as const;
