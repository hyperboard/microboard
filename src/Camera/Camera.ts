import { Matrix, Mbr, Point } from "Board/Items";
import { Pointer } from "Board/Pointer";
import { Subject } from "Subject";
import { toFiniteNumber } from "utils";

export class Camera {
	subject = new Subject<Camera>();
	resizeSubject = new Subject<Camera>();
	scaleLevels = [
		10, 9, 8, 7, 6, 5, 4, 3, 2.5, 2, 1.5, 1.25, 1, 0.75, 0.5, 0.33, 0.2,
		0.15, 0.1, 0.05, 0.03, 0.02, 0.01,
	] as const;
	maxScale = 10;
	minScale = 0.001;
	matrix = new Matrix();
	readonly pointer = new Point();
	window = {
		width: document.documentElement.clientWidth,
		height: document.documentElement.clientHeight,
		dpi: window.devicePixelRatio,
		getMbr: () => {
			return new Mbr(0, 0, this.window.width, this.window.height);
		},
	};

	private touchEvents: Map<number, PointerEvent> = new Map();
	private previousDistance: number | null = null;
	private previousPositions: { point1: Point; point2: Point } | null = null;
	boardId = "";

	constructor(private boardPointer = new Pointer()) {
		this.subject.subscribe((_camera: Camera) => {
			this.saveMatrixSnapshot();
		});
	}

	getMbr(): Mbr {
		const mbr = this.getUntransformedMbr();
		mbr.transform(this.matrix.getInverse());
		return mbr;
	}

	getNotInverseMbr(): Mbr {
		const mbr = this.getUntransformedMbr();
		mbr.transform(this.matrix);
		return mbr;
	}

	getUntransformedMbr(): Mbr {
		const { width, height: heigth } = this.window;
		const mbr = new Mbr(0, 0, width, heigth);
		return mbr;
	}

	private getScaleOneLevelIn(scale: number): number {
		let index = this.scaleLevels.length - 1;
		let level = this.scaleLevels[index];
		while (index > 0 && level <= scale) {
			index--;
			level = this.scaleLevels[index];
		}
		return level;
	}

	private getScaleOneLevelOut(scale: number): number {
		const length = this.scaleLevels.length;
		let index = 0;
		let level = this.scaleLevels[index];
		while (index < length - 1 && level >= scale) {
			index++;
			level = this.scaleLevels[index];
		}
		return level;
	}

	private limitScale(scale: number): number {
		if (scale < this.minScale) {
			return this.minScale;
		} else if (scale > this.maxScale) {
			return this.maxScale;
		} else {
			return scale;
		}
	}

	view(_left: number, _top: number, _scale: number): void {}

	zoomRelativeToPointerBy(scale: number): void {
		this.zoomRelativeToPointBy(scale, this.pointer.x, this.pointer.y);
	}

	zoomRelativeToPointBy(scale: number, x: number, y: number): void {
		const boardPointX = (x - this.matrix.translateX) / this.matrix.scaleX;
		const boardPointY = (y - this.matrix.translateY) / this.matrix.scaleX;
		this.matrix.scaleX *= scale;
		this.matrix.scaleY *= scale;
		this.matrix.scaleX = this.limitScale(this.matrix.scaleX);
		this.matrix.scaleY = this.limitScale(this.matrix.scaleY);
		this.matrix.translateX = x - boardPointX * this.matrix.scaleX;
		this.matrix.translateY = y - boardPointY * this.matrix.scaleY;
		this.subject.publish(this);
	}

	saveDownEvent(event: PointerEvent): void {
		this.touchEvents.set(event.pointerId, event);
		if (this.touchEvents.size === 2) {
			this.updateDistance();
			this.updatePositions();
		}
	}

	getMatrixSnapshot(): Matrix | undefined {
		try {
			const snap = localStorage.getItem(`camera_${this.boardId}`);
			if (snap) {
				const matrix = JSON.parse(snap);
				if (
					"translateX" in matrix &&
					"translateY" in matrix &&
					"scaleX" in matrix &&
					"scaleY" in matrix &&
					"shearX" in matrix &&
					"shearY" in matrix
				) {
					return matrix as Matrix;
				}
			}
			throw new Error();
		} catch {
			return undefined;
		}
	}

	saveMatrixSnapshot(): void {
		if (this.boardId) {
			localStorage.setItem(
				`camera_${this.boardId}`,
				JSON.stringify(this.getMatrix()),
			);
		}
	}

	setBoardId(id: string) {
		this.boardId = id;
		return this;
	}

	private applyMatrix(matrix: Matrix): void {
		this.matrix = new Matrix(
			matrix.translateX,
			matrix.translateY,
			matrix.scaleX,
			matrix.scaleY,
			matrix.shearX,
			matrix.shearY,
		);
		this.subject.publish(this);
	}

	/** Returns true if found and used saved snapshot, false otherwise */
	useSavedSnapshot(optionalMatrix?: Matrix): boolean {
		if (optionalMatrix) {
			this.applyMatrix(optionalMatrix);
			return true;
		} else {
			const cachedCameraMatrix = this.getMatrixSnapshot();
			if (cachedCameraMatrix) {
				this.applyMatrix(cachedCameraMatrix);
				return true;
			}
		}
		return false;
	}

	updatePositions(): void {
		const [touch1, touch2] = Array.from(this.touchEvents.values());
		this.previousPositions = {
			point1: new Point(touch1.pageX, touch1.pageY),
			point2: new Point(touch2.pageX, touch2.pageY),
		};
	}

	updateDistance(): void {
		this.previousDistance = this.calculateDistance();
	}

	removeDownEvent(event: PointerEvent): void {
		this.touchEvents.delete(event.pointerId);
		if (this.touchEvents.size !== 2) {
			this.previousDistance = null;
			this.previousPositions = null;
		}
	}

	updateDownEvent(event: PointerEvent): void {
		if (this.touchEvents.has(event.pointerId)) {
			this.touchEvents.set(event.pointerId, event);
		}
	}

	isTwoPointers(): boolean {
		return this.touchEvents.size === 2;
	}

	getPinchCenter(): { x: number; y: number } {
		const [touch1, touch2] = Array.from(this.touchEvents.values());
		const centerX = (touch1.pageX + touch2.pageX) / 2;
		const centerY = (touch1.pageY + touch2.pageY) / 2;
		return { x: centerX, y: centerY };
	}

	isPinch(): boolean {
		/*
                const threshold = this.previous === "pinch" ? 0.2 : 10;
                const distance = this.calculateDistance();
                const is =
                        this.previousDistance !== null &&
                        Math.abs(distance - this.previousDistance) > threshold;
                this.previous = is ? "pinch" : "pan";
                */
		const previous = this.previousPositions;
		if (!previous) {
			return false;
		}

		const [touch1, touch2] = Array.from(this.touchEvents.values());
		const current = {
			point1: new Point(touch1.pageX, touch1.pageY),
			point2: new Point(touch2.pageX, touch2.pageY),
		};

		function getDirection(deltaX: number, deltaY: number): string {
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				return deltaX > 0 ? "right" : "left";
			} else {
				return deltaY > 0 ? "down" : "up";
			}
		}

		const direction1 = getDirection(
			previous?.point1.x - current.point1.x,
			previous?.point1.y - current.point1.y,
		);
		const direction2 = getDirection(
			previous?.point2.x - current.point2.x,
			previous?.point2.y - current.point2.y,
		);
		return (
			direction1 !== direction2 &&
			this.previousDistance !== null &&
			Math.abs(this.calculateDistance() - this.previousDistance) > 5
		);
	}

	getPinchScale(): number {
		if (this.previousDistance === null) {
			return 1;
		}

		const currentDistance = this.calculateDistance();
		const scale = currentDistance / this.previousDistance;
		this.previousDistance = currentDistance;
		return scale;
	}

	getPanDelta(): { x: number; y: number } {
		if (this.previousPositions === null) {
			return { x: 0, y: 0 };
		}
		const [touch1] = Array.from(this.touchEvents.values());
		const delta1 = {
			x:
				(touch1.pageX - this.previousPositions.point1.x) /
				this.matrix.scaleX,
			y:
				(touch1.pageY - this.previousPositions.point1.y) /
				this.matrix.scaleX,
		};
		const delta = delta1;
		return delta;
	}

	private calculateDistance(): number {
		const [touch1, touch2] = Array.from(this.touchEvents.values());
		return Math.sqrt(
			Math.pow(touch2.pageX - touch1.pageX, 2) +
				Math.pow(touch2.pageY - touch1.pageY, 2),
		);
	}

	zoomToViewCenter(scale: number): void {
		const centerX = this.window.width / 2;
		const centerY = this.window.height / 2;
		const oldScale = this.matrix.scaleX;
		const newScale = this.limitScale(scale);
		const relation = newScale / oldScale;
		this.zoomRelativeToPointBy(relation, centerX, centerY);
	}

	zoomInToViewCenter(): void {
		const oldScale = this.matrix.scaleX;
		const newScale = this.getScaleOneLevelIn(oldScale);
		this.zoomToViewCenter(newScale);
	}

	zoomOutFromViewCenter(): void {
		const oldScale = this.matrix.scaleX;
		const newScale = this.getScaleOneLevelOut(oldScale);
		this.zoomToViewCenter(newScale);
	}

	viewRectangle(mbr: Mbr, offsetInPercent = 10): void {
		const offsetY = (mbr.getHeight() * offsetInPercent) / 100;
		const offsetX = (mbr.getWidth() * offsetInPercent) / 100;
		const mbrWithOffset = new Mbr();
		mbrWithOffset.left = mbr.left - offsetX;
		mbrWithOffset.right = mbr.right + offsetX;
		mbrWithOffset.top = mbr.top - offsetY;
		mbrWithOffset.bottom = mbr.bottom + offsetY;
		const mbrWidth = mbrWithOffset.getWidth();
		const mbrHeight = mbrWithOffset.getHeight();

		// Calculate the scale values
		const scaleX = this.window.width / mbrWidth;
		const scaleY = this.window.height / mbrHeight;

		// Choose the smaller scale value to maintain the aspect ratio
		let scale = Math.min(scaleX, scaleY);

		// Ensure the scale is not less than the minimum scale
		scale = Math.max(scale, this.minScale);

		// Calculate the translation values
		let translationX, translationY;

		// Center the Mbr in the view
		translationX =
			this.window.width / 2 - (mbrWithOffset.left + mbrWidth / 2) * scale;
		translationY =
			this.window.height / 2 -
			(mbrWithOffset.top + mbrHeight / 2) * scale;

		this.matrix.translateX = translationX;
		this.matrix.translateY = translationY;
		this.matrix.scaleX = scale;
		this.matrix.scaleY = scale;

		this.subject.publish(this);
	}

	zoomToFit(rect: Mbr, offsetInPercent = 10): void {
		this.viewRectangle(rect, offsetInPercent);
	}

	getViewPointer(): { x: number; y: number } {
		return { x: 0, y: 0 };
	}

	translateTo(x: number, y: number): void {
		this.matrix.translate(x, y);
		this.updateBoardPointer();
		this.subject.publish(this);
	}

	translateBy(x: number, y: number): void {
		this.matrix.translate(x * this.matrix.scaleX, y * this.matrix.scaleY);
		this.updateBoardPointer();
		this.subject.publish(this);
	}

	getTranslation(): { x: number; y: number } {
		return { x: this.matrix.translateX, y: this.matrix.translateY };
	}

	getScale(): number {
		return this.matrix.scaleX;
	}

	getMatrix(): Matrix {
		return this.matrix;
	}

	private updateBoardPointer(): void {
		const boardPointX =
			(this.pointer.x - this.matrix.translateX) / this.matrix.scaleX;
		const boardPointY =
			(this.pointer.y - this.matrix.translateY) / this.matrix.scaleX;
		this.boardPointer.pointTo(boardPointX, boardPointY);
	}

	pointTo(x: number, y: number): void {
		this.pointer.x = toFiniteNumber(x);
		this.pointer.y = toFiniteNumber(y);
		this.updateBoardPointer();
	}

	onWindowResize(): void {
		this.window.width = document.documentElement.clientWidth;
		this.window.height = document.documentElement.clientHeight;
		this.window.dpi = window.devicePixelRatio;
		this.resizeSubject.publish(this);
		this.subject.publish(this);
	}
}
