export interface TransformationData {
	translateX: number;
	translateY: number;
	scaleX: number;
	scaleY: number;
	rotate: number;
	isLocked: boolean;
}

export class DefaultTransformationData implements TransformationData {
	constructor(
		public translateX = 0,
		public translateY = 0,
		public scaleX = 1,
		public scaleY = 1,
		public rotate = 0,
		public isLocked = false
	) {}
}
