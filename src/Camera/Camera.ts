import { safeRequestAnimationFrame } from 'api/safeRequestAnimationFrame';
import { Matrix, Point, Mbr, Item } from 'Items';
import { Keyboard } from 'Keyboard';
import { toFiniteNumber } from 'lib';
import { Pointer } from 'Pointer';
import { conf } from 'Settings';
import { Subject } from 'Subject';
import {throttle} from "../utils";

export class Camera {
	subject = new Subject<Camera>();
	resizeSubject = new Subject<Camera>();
	scaleLevels = [
		10, 9, 8, 7, 6, 5, 4, 3, 2.5, 2, 1.5, 1.25, 1, 0.75, 0.5, 0.33, 0.2, 0.15, 0.1, 0.05, 0.03,
		0.02, 0.01,
	] as const;
	maxScale = 10;
	minScale = 0.001;
	matrix = new Matrix();
	readonly pointer = new Point();
	window = {
		width: conf.getDocumentWidth(),
		height: conf.getDocumentHeight(),
		dpi: conf.getDPI(),
		getMbr: () => {
			return new Mbr(0, 0, this.window.width, this.window.height);
		},
	};

	private touchEvents: Map<number, PointerEvent> = new Map();
	private previousDistance: number | null = null;
	private previousPositions: { point1: Point; point2: Point } | null = null;
	boardId = '';
	private observableItem: Item | null = null;
	private throttledZoom: () => void;
	isTrackingAnimation = false;
	private localAnimationTarget: { translateX: number; translateY: number; scaleX: number; scaleY: number } | null = null;
	private localAnimationId: number | null = null;
	private localLastTime: number | null = null;
	private localSpringVelocity = { translateX: 0, translateY: 0, scaleX: 0, scaleY: 0 };
	private trackingAnimationId: number | null = null;
	private trackingTarget: Matrix | null = null;
	private lastTrackingTime: number | null = null;
	private springVelocity = { translateX: 0, translateY: 0, scaleX: 0, scaleY: 0, shearX: 0, shearY: 0 };

	constructor(private boardPointer = new Pointer()) {
		this.subject.subscribe((_camera: Camera) => {
			this.saveMatrixSnapshot();
		});

		this.throttledZoom = throttle(() => {
			if (!this.observableItem) {
				return;
			}
			const mbr = this.observableItem.getMbr();
			if (mbr.getHeight() > 40 && mbr.getWidth() > 600) {
				this.zoomToFit(mbr, 20, 350);
			}
		}, 400);
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

	unsubscribeFromItem(): void {
		if (this.observableItem) {
			this.observableItem.subject.unsubscribe(this.observeItem);
			this.observableItem = null;
		}
	}

	subscribeToItem(item: Item): void {
		this.observableItem = item;
		this.observableItem.subject.subscribe(this.observeItem);
	}

	private observeItem = (): void => {
		if (this.observableItem) {
			this.throttledZoom();
		}
	};

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

	zoomRelativeToPointBy(scale: number, x: number, y: number, duration = 400): void {
		// When a spring animation is in progress, base the new target on the existing
		// target position (not the mid-animation matrix) so that rapid events accumulate
		// correctly (e.g. three quick scroll ticks each add ×1.1, not each restart from
		// wherever the spring currently happens to be).
		const base = this.localAnimationTarget ?? this.matrix;
		const startScaleX = base.scaleX;
		const startScaleY = base.scaleY;
		const startTranslateX = base.translateX;
		const startTranslateY = base.translateY;

		const boardPointX = (x - startTranslateX) / startScaleX;
		const boardPointY = (y - startTranslateY) / startScaleY;
		const finalScaleX = this.limitScale(startScaleX * scale);
		const finalScaleY = this.limitScale(startScaleY * scale);

		if (finalScaleX === startScaleX && finalScaleY === startScaleY) {
			return;
		}

		// Derive translation from the clamped scale so that hitting the scale
		// limit never produces a spurious pan offset.
		const finalTranslateX = x - boardPointX * finalScaleX;
		const finalTranslateY = y - boardPointY * finalScaleY;

		if (duration === 0) {
			this.matrix.translateX = finalTranslateX;
			this.matrix.translateY = finalTranslateY;
			this.matrix.scaleX = finalScaleX;
			this.matrix.scaleY = finalScaleY;
			this.subject.publish(this);
			return;
		}

		this.animateLocalToTarget({
			translateX: finalTranslateX,
			translateY: finalTranslateY,
			scaleX: finalScaleX,
			scaleY: finalScaleY,
		});
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
					'translateX' in matrix &&
					'translateY' in matrix &&
					'scaleX' in matrix &&
					'scaleY' in matrix &&
					'shearX' in matrix &&
					'shearY' in matrix
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
			localStorage.setItem(`camera_${this.boardId}`, JSON.stringify(this.getMatrix()));
		}
	}

	setBoardId(id: string): this {
		this.boardId = id;
		return this;
	}

	applyMatrix(matrix: Matrix): void {
		this.matrix = new Matrix(
			matrix.translateX,
			matrix.translateY,
			matrix.scaleX,
			matrix.scaleY,
			matrix.shearX,
			matrix.shearY
		);
		this.subject.publish(this);
	}

	animateToMatrix(target: Matrix): void {
		if (this.trackingTarget) {
			this.trackingTarget.translateX = target.translateX;
			this.trackingTarget.translateY = target.translateY;
			this.trackingTarget.scaleX = target.scaleX;
			this.trackingTarget.scaleY = target.scaleY;
			this.trackingTarget.shearX = target.shearX;
			this.trackingTarget.shearY = target.shearY;
		} else {
			this.trackingTarget = new Matrix(
				target.translateX,
				target.translateY,
				target.scaleX,
				target.scaleY,
				target.shearX,
				target.shearY
			);
		}

		if (this.trackingAnimationId !== null) {
			return;
		}

		this.isTrackingAnimation = true;
		this.lastTrackingTime = null;

		// Critically-damped spring: smooth acceleration and deceleration, no bounce.
		// critical damping = 2 * sqrt(stiffness), so 28 > 2*sqrt(150)≈24.5 → slightly overdamped
		const STIFFNESS = 150;
		const DAMPING = 28;
		const SNAP_PX = 0.5;
		const SNAP_SCALE = 0.0005;
		const SNAP_VEL = 1; // px/s below which we consider settled

		const springStep = (pos: number, tgt: number, vel: number, dt: number): [pos: number, vel: number] => {
			const acc = STIFFNESS * (tgt - pos) - DAMPING * vel;
			const newVel = vel + acc * dt;
			return [pos + newVel * dt, newVel];
		};

		const loop = (): void => {
			const tgt = this.trackingTarget;
			if (!tgt) {
				this.trackingAnimationId = null;
				this.isTrackingAnimation = false;
				return;
			}

			const now = performance.now();
			const dt = Math.min(this.lastTrackingTime !== null ? now - this.lastTrackingTime : 16, 50) / 1000;
			this.lastTrackingTime = now;

			const v = this.springVelocity;
			const [tx, vtx] = springStep(this.matrix.translateX, tgt.translateX, v.translateX, dt);
			const [ty, vty] = springStep(this.matrix.translateY, tgt.translateY, v.translateY, dt);
			const [sx, vsx] = springStep(this.matrix.scaleX, tgt.scaleX, v.scaleX, dt);
			const [sy, vsy] = springStep(this.matrix.scaleY, tgt.scaleY, v.scaleY, dt);
			const [hx, vhx] = springStep(this.matrix.shearX, tgt.shearX, v.shearX, dt);
			const [hy, vhy] = springStep(this.matrix.shearY, tgt.shearY, v.shearY, dt);

			this.matrix.translateX = tx;
			this.matrix.translateY = ty;
			this.matrix.scaleX = sx;
			this.matrix.scaleY = sy;
			this.matrix.shearX = hx;
			this.matrix.shearY = hy;

			this.springVelocity = { translateX: vtx, translateY: vty, scaleX: vsx, scaleY: vsy, shearX: vhx, shearY: vhy };

			this.subject.publish(this);

			const settled =
				Math.abs(tgt.translateX - tx) < SNAP_PX &&
				Math.abs(tgt.translateY - ty) < SNAP_PX &&
				Math.abs(tgt.scaleX - sx) < SNAP_SCALE &&
				Math.abs(vtx) < SNAP_VEL &&
				Math.abs(vty) < SNAP_VEL;

			if (settled) {
				this.matrix.translateX = tgt.translateX;
				this.matrix.translateY = tgt.translateY;
				this.matrix.scaleX = tgt.scaleX;
				this.matrix.scaleY = tgt.scaleY;
				this.matrix.shearX = tgt.shearX;
				this.matrix.shearY = tgt.shearY;
				this.subject.publish(this);
				this.springVelocity = { translateX: 0, translateY: 0, scaleX: 0, scaleY: 0, shearX: 0, shearY: 0 };
				this.trackingTarget = null;
				this.trackingAnimationId = null;
				this.isTrackingAnimation = false;
				return;
			}

			this.trackingAnimationId = safeRequestAnimationFrame(loop) || null;
		};

		this.trackingAnimationId = safeRequestAnimationFrame(loop) || null;
	}

	cancelTrackingAnimation(): void {
		if (this.trackingAnimationId !== null) {
			cancelAnimationFrame(this.trackingAnimationId);
			this.trackingAnimationId = null;
		}
		this.trackingTarget = null;
		this.lastTrackingTime = null;
		this.springVelocity = { translateX: 0, translateY: 0, scaleX: 0, scaleY: 0, shearX: 0, shearY: 0 };
		this.isTrackingAnimation = false;
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
				return deltaX > 0 ? 'right' : 'left';
			} else {
				return deltaY > 0 ? 'down' : 'up';
			}
		}

		const direction1 = getDirection(
			previous?.point1.x - current.point1.x,
			previous?.point1.y - current.point1.y
		);
		const direction2 = getDirection(
			previous?.point2.x - current.point2.x,
			previous?.point2.y - current.point2.y
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
			x: (touch1.pageX - this.previousPositions.point1.x) / this.matrix.scaleX,
			y: (touch1.pageY - this.previousPositions.point1.y) / this.matrix.scaleX,
		};
		const delta = delta1;
		return delta;
	}

	private calculateDistance(): number {
		const [touch1, touch2] = Array.from(this.touchEvents.values());
		return Math.sqrt(
			Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
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

	addToView(mbr: Mbr, inView: Item[]): void {
		if (!mbr.isEnclosedBy(this.getMbr())) {
			this.viewRectangle(
				inView
					.reduce(
						(acc, item) => acc.combine(item.getMbr()),
						inView[0]?.getMbr() ?? new Mbr()
					)
					.combine(mbr)
			);
		}
	}

	viewRectangle(mbr: Mbr, offsetInPercent = 10, duration = 500): void {
		if (mbr.left === mbr.right && mbr.bottom === mbr.top) {
			mbr.left -= 100;
			mbr.right += 100;
			mbr.top -= 100;
			mbr.bottom += 100;
		}
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
		let targetScale = Math.min(scaleX, scaleY);

		// Ensure the scale is not less than the minimum scale
		targetScale = Math.max(targetScale, this.minScale);
		targetScale = Math.min(targetScale, this.maxScale);

		// Calculate the translation values
		// Center the Mbr in the view
		const translationX =
			this.window.width / 2 - (mbrWithOffset.left + mbrWidth / 2) * targetScale;
		const translationY =
			this.window.height / 2 - (mbrWithOffset.top + mbrHeight / 2) * targetScale;

		if (duration === 0) {
			this.matrix.translateX = translationX;
			this.matrix.translateY = translationY;
			this.matrix.scaleX = targetScale;
			this.matrix.scaleY = targetScale;
			this.subject.publish(this);
			return;
		}

		this.animateLocalToTarget({
			translateX: translationX,
			translateY: translationY,
			scaleX: targetScale,
			scaleY: targetScale,
		});
	}

	cancelLocalAnimation(): void {
		if (this.localAnimationId !== null) {
			cancelAnimationFrame(this.localAnimationId);
			this.localAnimationId = null;
		}
		this.localAnimationTarget = null;
		this.localLastTime = null;
		this.localSpringVelocity = { translateX: 0, translateY: 0, scaleX: 0, scaleY: 0 };
	}

	private animateLocalToTarget(target: { translateX: number; translateY: number; scaleX: number; scaleY: number }): void {
		this.localAnimationTarget = target;
		if (this.localAnimationId !== null) {
			return; // loop already running, target updated above
		}

		this.localLastTime = null;

		// Same critically-damped spring as animateToMatrix
		const STIFFNESS = 150;
		const DAMPING = 28;
		const SNAP_PX = 0.5;
		const SNAP_SCALE = 0.0005;
		const SNAP_VEL = 1;

		const springStep = (pos: number, tgt: number, vel: number, dt: number): [number, number] => {
			const acc = STIFFNESS * (tgt - pos) - DAMPING * vel;
			const newVel = vel + acc * dt;
			return [pos + newVel * dt, newVel];
		};

		const loop = (): void => {
			const tgt = this.localAnimationTarget;
			if (!tgt) {
				this.localAnimationId = null;
				return;
			}

			const now = performance.now();
			const dt = Math.min(this.localLastTime !== null ? now - this.localLastTime : 16, 50) / 1000;
			this.localLastTime = now;

			const v = this.localSpringVelocity;
			const [tx, vtx] = springStep(this.matrix.translateX, tgt.translateX, v.translateX, dt);
			const [ty, vty] = springStep(this.matrix.translateY, tgt.translateY, v.translateY, dt);
			const [sx, vsx] = springStep(this.matrix.scaleX, tgt.scaleX, v.scaleX, dt);
			const [sy, vsy] = springStep(this.matrix.scaleY, tgt.scaleY, v.scaleY, dt);

			this.matrix.translateX = tx;
			this.matrix.translateY = ty;
			this.matrix.scaleX = sx;
			this.matrix.scaleY = sy;
			this.localSpringVelocity = { translateX: vtx, translateY: vty, scaleX: vsx, scaleY: vsy };
			this.updateBoardPointer();
			this.subject.publish(this);

			const settled =
				Math.abs(tgt.translateX - tx) < SNAP_PX &&
				Math.abs(tgt.translateY - ty) < SNAP_PX &&
				Math.abs(tgt.scaleX - sx) < SNAP_SCALE &&
				Math.abs(vtx) < SNAP_VEL &&
				Math.abs(vty) < SNAP_VEL;

			if (settled) {
				this.matrix.translateX = tgt.translateX;
				this.matrix.translateY = tgt.translateY;
				this.matrix.scaleX = tgt.scaleX;
				this.matrix.scaleY = tgt.scaleY;
				this.localSpringVelocity = { translateX: 0, translateY: 0, scaleX: 0, scaleY: 0 };
				this.localAnimationTarget = null;
				this.localAnimationId = null;
				this.localLastTime = null;
				this.updateBoardPointer();
				this.subject.publish(this);
				return;
			}

			this.localAnimationId = safeRequestAnimationFrame(loop) || null;
		};

		this.localAnimationId = safeRequestAnimationFrame(loop) || null;
	}

	zoomToFit(rect: Mbr, offsetInPercent = 10, duration = 480): void {
		this.viewRectangle(rect, offsetInPercent, duration);
	}

	getViewPointer(): { x: number; y: number } {
		return { x: 0, y: 0 };
	}

	translateTo(x: number, y: number): void {
		this.cancelLocalAnimation();
		this.matrix.translate(x, y);
		this.updateBoardPointer();
		this.subject.publish(this);
	}

	translateBy(x: number, y: number): void {
		this.cancelLocalAnimation();
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
		const boardPointX = (this.pointer.x - this.matrix.translateX) / this.matrix.scaleX;
		const boardPointY = (this.pointer.y - this.matrix.translateY) / this.matrix.scaleX;
		this.boardPointer.pointTo(boardPointX, boardPointY);
	}

	pointTo(x: number, y: number): void {
		this.pointer.x = toFiniteNumber(x);
		this.pointer.y = toFiniteNumber(y);
		this.updateBoardPointer();
	}

	onWindowResize(): void {
		this.window.width = conf.getDocumentWidth();
		this.window.height = conf.getDocumentHeight();
		this.window.dpi = conf.getDPI();
		this.resizeSubject.publish(this);
		this.subject.publish(this);
	}

	smoothTranslateTo(keyboard: Keyboard, shouldTranslate: boolean): void {
		if (!shouldTranslate) {
			return;
		}

		const friction = 0.9;
		let x = 0;
		let y = 0;
		const { activeKeys } = keyboard;

		const directions: Record<string, [number, number]> = {
			ArrowRight: [-conf.NAVIGATION_STEP, 0],
			ArrowLeft: [conf.NAVIGATION_STEP, 0],
			ArrowDown: [0, -conf.NAVIGATION_STEP],
			ArrowUp: [0, conf.NAVIGATION_STEP],
		};

		const activeArrowKeys: string[] = Array.from(activeKeys as Set<string>)
			.filter(key => key in directions)
			.sort();

		if (activeArrowKeys.length === 2) {
			// If opposite keys are pressed simultaneously, ignore them
			if (
				(activeArrowKeys.includes('ArrowUp') && activeArrowKeys.includes('ArrowDown')) ||
				(activeArrowKeys.includes('ArrowLeft') && activeArrowKeys.includes('ArrowRight'))
			) {
				x = 0;
				y = 0;
			} else {
				const [firstKey, secondKey] = activeArrowKeys;
				x = (directions[firstKey]?.[0] || 0) + (directions[secondKey]?.[0] || 0);
				y = (directions[firstKey]?.[1] || 0) + (directions[secondKey]?.[1] || 0);
			}
		} else if (activeArrowKeys.length === 1) {
			const key = activeArrowKeys[0];
			x = directions[key]?.[0] || 0;
			y = directions[key]?.[1] || 0;
		}

		const animate = (): void => {
			if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
				this.translateTo(x, y);
				x *= friction;
				y *= friction;
				requestAnimationFrame(animate);
			}
		};

		requestAnimationFrame(animate);
	}
}
