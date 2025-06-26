import {LayoutBlockNode} from "./Render";

export interface LayoutBlockNodes {
	nodes: LayoutBlockNode[];
	maxWidth: number;
	width: number;
	height: number;
	didBreakWords: boolean;
	render: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, scale?: number) => void;
	realign: (newMaxWidht: number) => void;
	recoordinate: (newMaxWidth?: number) => void;
	linkPositions: {
		link: string;
		left: number;
		top: number;
		right: number;
		bottom: number;
	}[];
}
