import { SubjectOperation } from 'SubjectOperation';
import { Events, Operation } from '../../Events';
import { Point } from '../Point';
import { Matrix } from './Matrix';
import { TransformationCommand } from './TransformationCommand';
import { DefaultTransformationData, TransformationData } from './TransformationData';
import { MatrixData, TransformationOperation } from './TransformationOperations';

const defaultData = new DefaultTransformationData();

export class Transformation {
	readonly subject = new SubjectOperation<Transformation, TransformationOperation>();
	private _matrix = new Matrix();
	previous = new Matrix();
	private rotate = defaultData.rotate;
	isLocked = false;

	constructor(private id = '', private events?: Events) {}

	// ─── Public read API ──────────────────────────────────────────────────────

	getMatrixData(): MatrixData {
		const { translateX, translateY, scaleX, scaleY, shearX, shearY } = this._matrix;
		return { translateX, translateY, scaleX, scaleY, shearX, shearY };
	}

	/** Returns a detached copy of the Matrix for passing to renderers. */
	toMatrix(): Matrix {
		return this._matrix.copy();
	}

	applyToContext(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
		this._matrix.applyToContext(ctx);
	}

	getTranslation(): { x: number; y: number } {
		return { x: this._matrix.translateX, y: this._matrix.translateY };
	}

	getScale(): { x: number; y: number } {
		return { x: this._matrix.scaleX, y: this._matrix.scaleY };
	}

	getRotation(): number {
		return this.rotate;
	}

	// ─── Local state setter (no event emitted, subscribers notified) ──────────

	/**
	 * Replaces the internal matrix entirely with `matrix` without emitting an operation.
	 * Used by the nesting system to convert between world and local coordinate spaces.
	 */
	setLocalMatrix(matrix: Matrix): void {
		this.previous = this._matrix.copy();
		this._matrix = matrix.copy();
		this.subject.publish(this, {
			class: 'Transformation',
			method: 'applyMatrix',
			items: [{ id: this.id, matrix: this.getMatrixData() }],
		});
	}

	setLocal(x: number, y: number, scaleX?: number, scaleY?: number): void
	setLocal(data: Partial<MatrixData>): void
	setLocal(xOrData: number | Partial<MatrixData>, y?: number, scaleX?: number, scaleY?: number): void {
		this.previous = this._matrix.copy();
		if (typeof xOrData === 'object') {
			if (xOrData.translateX !== undefined) this._matrix.translateX = xOrData.translateX;
			if (xOrData.translateY !== undefined) this._matrix.translateY = xOrData.translateY;
			if (xOrData.scaleX !== undefined) this._matrix.scaleX = xOrData.scaleX;
			if (xOrData.scaleY !== undefined) this._matrix.scaleY = xOrData.scaleY;
		} else {
			this._matrix.translateX = xOrData;
			this._matrix.translateY = y!;
			if (scaleX !== undefined) this._matrix.scaleX = scaleX;
			if (scaleY !== undefined) this._matrix.scaleY = scaleY;
		}
		this.subject.publish(this, {
			class: 'Transformation',
			method: 'applyMatrix',
			items: [{ id: this.id, matrix: this.getMatrixData() }],
		});
	}

	// ─── Serialization ────────────────────────────────────────────────────────

	serialize(): TransformationData {
		return {
			translateX: this._matrix.translateX,
			translateY: this._matrix.translateY,
			scaleX: this._matrix.scaleX,
			scaleY: this._matrix.scaleY,
			rotate: this.rotate,
			isLocked: this.isLocked,
		};
	}

	deserialize(
		data: TransformationData & {
			dimension?: {
				width: number;
				height: number;
			};
		}
	): this {
		this.previous = this._matrix.copy();
		if (data.translateX) {
			this._matrix.translateX = data.translateX;
		}
		if (data.translateY) {
			this._matrix.translateY = data.translateY;
		}
		if (data.scaleX) {
			this._matrix.scaleX = data.scaleX;
		}
		if (data.scaleY) {
			this._matrix.scaleY = data.scaleY;
		}
		if (data.isLocked) {
			this.isLocked = data.isLocked;
		}
		if (data.rotate) {
			// TODO to rotate to a degree calculate rotation by
			// if (data.dimension) {
			// 	this._matrix.rotateByObjectCenter(
			// 		data.rotate,
			// 		{
			// 			width: data.dimension.width,
			// 			height: data.dimension.height,
			// 		},
			// 		{ x: data.scaleX, y: data.scaleY }
			// 	);
			// } else {
			// 	this._matrix.rotateBy(data.rotate);
			// }
			this.rotate = data.rotate;
		}
		this.subject.publish(this, {
			class: 'Transformation',
			method: 'deserialize',
			item: [this.id],
			data,
		});
		return this;
	}

	copy(id?: string): Transformation {
		const { translateX, translateY, scaleX, scaleY } = this._matrix;
		const { rotate } = this;
		return new Transformation(id || '', this.events).deserialize({
			translateX,
			translateY,
			scaleX,
			scaleY,
			rotate,
			isLocked: false,
		});
	}

	getInverse(): Transformation {
		const copy = this.copy();
		copy._matrix.invert();
		return copy;
	}

	getId(): string {
		return this.id;
	}

	setId(id: string): void {
		this.id = id;
	}

	// ─── Event emission ───────────────────────────────────────────────────────

	emit(operation: TransformationOperation): void {
		if (this.events) {
			const command = new TransformationCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	private emitMatrix(matrix: MatrixData, timeStamp?: number): void {
		this.emit({
			class: 'Transformation',
			method: 'applyMatrix',
			items: [{ id: this.id, matrix }],
			timeStamp,
		});
	}

	translateTo(x: number, y: number, timeStamp?: number): void {
		if (!this.id) {
			// TODO console.warn("Transformation.translateTo() has no itemId");
		}
		this.emitMatrix({
			translateX: x - this._matrix.translateX,
			translateY: y - this._matrix.translateY,
			scaleX: 1,
			scaleY: 1,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	translateBy(x: number, y: number, timeStamp?: number): void {
		if (!this.id) {
			// TODO console.warn("Transformation.translateTo() has no itemId");
		}
		if (x === 0 && y === 0) {
			return;
		}
		this.emitMatrix({
			translateX: x,
			translateY: y,
			scaleX: 1,
			scaleY: 1,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	scaleTo(x: number, y: number, timeStamp?: number): void {
		this.emitMatrix({
			translateX: 0,
			translateY: 0,
			scaleX: x / this._matrix.scaleX,
			scaleY: y / this._matrix.scaleY,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	scaleBy(x: number, y: number, timeStamp?: number): void {
		if (x === 0 && y === 0) {
			return;
		}
		this.emitMatrix({
			translateX: 0,
			translateY: 0,
			scaleX: x,
			scaleY: y,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	scaleByTranslateBy(
		scale: { x: number; y: number },
		translate: { x: number; y: number },
		timeStamp?: number
	): void {
		if (scale.x === 0 && scale.y === 0 && translate.x === 0 && translate.y === 0) {
			return;
		}
		this.emitMatrix({
			translateX: translate.x,
			translateY: translate.y,
			scaleX: scale.x,
			scaleY: scale.y,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	rotateTo(degree: number, timeStamp?: number): void {
		this.emit({
			class: 'Transformation',
			method: 'rotateTo',
			item: [this.id],
			degree,
			timeStamp,
		});
	}

	rotateBy(degree: number, timeStamp?: number): void {
		this.emit({
			class: 'Transformation',
			method: 'rotateBy',
			item: [this.id],
			degree,
			timeStamp,
		});
	}

	scaleToRelativeTo(x: number, y: number, _point: Point, timeStamp?: number): void {
		this.emitMatrix({
			translateX: 0,
			translateY: 0,
			scaleX: x / this._matrix.scaleX,
			scaleY: y / this._matrix.scaleY,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	scaleByRelativeTo(x: number, y: number, point: Point, timeStamp?: number): void {
		const { scaleX: sx0, scaleY: sy0, translateX: tx0, translateY: ty0 } = this._matrix;
		const newSx = sx0 * x;
		const newSy = sy0 * y;
		this.emitMatrix({
			translateX: -point.x * newSx + point.x - tx0,
			translateY: -point.y * newSy + point.y - ty0,
			scaleX: x,
			scaleY: y,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	applyMatrixSilent(matrixData: MatrixData): void {
		this.previous = this._matrix.copy();
		this._matrix.scale(matrixData.scaleX, matrixData.scaleY);
		this._matrix.translate(matrixData.translateX, matrixData.translateY);
		this.subject.publish(this, {
			class: 'Transformation',
			method: 'applyMatrix',
			items: [{ id: this.id, matrix: matrixData }],
		});
	}

	setIsLocked(isLocked: boolean, timestamp?: number): void {
		if (isLocked) {
			this.emit({
				class: 'Transformation',
				method: 'locked',
				item: [this.id],
				locked: true,
				timestamp,
			});
		} else {
			this.emit({
				class: 'Transformation',
				method: 'unlocked',
				item: [this.id],
				locked: false,
				timestamp,
			});
		}
	}

	// ─── Apply (called by command system, not directly) ───────────────────────

	apply(op: Operation): void {
		this.previous = this._matrix.copy();
		switch (op.method) {
			case 'applyMatrix': {
				const itemOp = op.items.find(i => i.id === this.id);
				if (itemOp) {
					this._matrix.scale(itemOp.matrix.scaleX, itemOp.matrix.scaleY);
					this._matrix.translate(itemOp.matrix.translateX, itemOp.matrix.translateY);
				}
				break;
			}
			// @deprecated — legacy events only, new events use applyMatrix
			case 'translateTo':
				this.applyTranslateTo(op.x, op.y);
				break;
			case 'translateBy':
				this.applyTranslateBy(op.x, op.y);
				break;
			case 'scaleTo':
				this.applyScaleTo(op.x, op.y);
				break;
			case 'scaleBy':
				this.applyScaleBy(op.x, op.y);
				break;
			case 'scaleToRelativeTo':
				this.applyScaleToRelativeTo(op.x, op.y, op.point);
				break;
			case 'scaleByRelativeTo':
				this.applyScaleByRelativeTo(op.x, op.y, op.point);
				break;
			case 'scaleByTranslateBy':
				this.applyScaleByTranslateBy(op.scale, op.translate);
				break;
			// end @deprecated
			case 'rotateTo':
				this.applyRotateTo(op.degree);
				break;
			case 'rotateBy':
				this.applyRotateBy(op.degree);
				break;
			case 'transformMany':
				this.applyTransformMany(op.items[this.id]);
				break;
			case 'locked':
				this.applyLocked(op.locked);
				break;
			case 'unlocked':
				this.applyUnlocked(op.locked);
				break;
			default:
				return;
		}
		this.subject.publish(this, op);
	}

	// ─── Legacy apply helpers (for replaying old events) ─────────────────────

	/** @deprecated Only for replaying legacy events. Do not call directly. */
	applyTranslateTo(x: number, y: number): void {
		this._matrix.translateX = x;
		this._matrix.translateY = y;
	}

	/** @deprecated Only for replaying legacy events. Do not call directly. */
	applyTranslateBy(x: number, y: number): void {
		this._matrix.translate(x, y);
	}

	/** @deprecated Only for replaying legacy events. Do not call directly. */
	applyScaleTo(x: number, y: number): void {
		this._matrix.scaleX = x;
		this._matrix.scaleY = y;
	}

	/** @deprecated Only for replaying legacy events. Do not call directly. */
	applyScaleBy(x: number, y: number): void {
		this._matrix.scale(x, y);
	}

	/** @deprecated Only for replaying legacy events. Do not call directly. */
	applyScaleByTranslateBy(
		scale: { x: number; y: number },
		translate: { x: number; y: number }
	): void {
		this._matrix.scale(scale.x, scale.y);
		this._matrix.translate(translate.x, translate.y);
	}

	applyTransformMany(op: TransformationOperation): void {
		if (op.method === 'applyMatrix') {
			const itemOp = op.items.find((i) => i.id === this.id);
			if (itemOp) {
				this._matrix.scale(itemOp.matrix.scaleX, itemOp.matrix.scaleY);
				this._matrix.translate(
					itemOp.matrix.translateX,
					itemOp.matrix.translateY
				);
			}
		} else if (op.method === 'scaleByTranslateBy') {
			this.applyScaleByTranslateBy(op.scale, op.translate);
		} else if (op.method === 'scaleBy') {
			this.applyScaleBy(op.x, op.y);
		} else if (op.method === 'translateBy') {
			this.applyTranslateBy(op.x, op.y);
		} else if (op.method === 'translateTo') {
			this.applyTranslateTo(op.x, op.y);
		}
	}

	applyScaleByRelativeTo(x: number, y: number, point: { x: number; y: number }): void {
		const scaleX = this._matrix.scaleX * x;
		const scaleY = this._matrix.scaleY * y;
		this._matrix.translateX = -point.x * scaleX + point.x;
		this._matrix.translateY = -point.y * scaleY + point.y;
		this._matrix.scaleX = scaleX;
		this._matrix.scaleY = scaleY;
	}

	applyScaleToRelativeTo(x: number, y: number, point: { x: number; y: number }): void {
		this.applyTranslateBy(-point.x, -point.y);
		this.applyScaleTo(x, y);
		this.applyTranslateBy(point.x, point.y);
	}

	applyRotateTo(degree: number): void {
		if (degree > 0) {
			while (degree > 360) {
				degree -= 360;
			}
			if (degree === 360) {
				degree = 0;
			}
		} else {
			while (degree < -360) {
				degree += 360;
			}
			if (degree === -360) {
				degree = 0;
			}
		}
		this.rotate = degree;
		// TODO to rotate to a degree calculate rotation by
		// this._matrix.rotateBy(degree);
	}

	applyRotateBy(degree: number): void {
		this.applyRotateTo(this.rotate + degree);
	}

	applyLocked(locked: boolean): void {
		this.isLocked = locked;
	}

	applyUnlocked(locked: boolean): void {
		this.isLocked = locked;
	}
}
