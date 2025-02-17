export interface LayoutBlockNodes {
	nodes: [];
	maxWidth: number;
	width: number;
	height: number;
	didBreakWords: boolean;
	render: (ctx: CanvasRenderingContext2D, scale?: number) => void;
	realign: (newMaxWidht: number) => void;
	recoordinate: (newMaxWidth?: number) => void;
}
