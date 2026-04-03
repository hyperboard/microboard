import { SubjectOperation } from 'SubjectOperation';
import type { Events } from '../../Events';
import { Point } from '../Point';
import { Matrix } from './Matrix';
import { TransformationCommand } from './TransformationCommand';
import { DefaultTransformationData, TransformationData } from './TransformationData';
import {
	ApplyMatrixOperation,
	MatrixData,
	TransformationOperation,
	ApplyMatrixItem
} from './TransformationOperations';

const defaultData = new DefaultTransformationData();

type LocalTransformationOperation =
	| {
			class: 'Transformation';
			method: 'setLocalMatrix';
			item: string[];
			matrix: MatrixData;
	  }
	| {
			class: 'Transformation';
			method: 'setLocal';
			item: string[];
			data: Partial<MatrixData>;
	  };

export class Transformation {
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

	// ─── Local state setters (Private, used by apply/deserialize) ─────────────

	private applyLocalMatrix(matrix: Matrix): void {
		this._matrix = matrix.copy();
	}

	private applyLocal(data: Partial<MatrixData>): void {
		if (data.translateX !== undefined) this._matrix.translateX = data.translateX;
		if (data.translateY !== undefined) this._matrix.translateY = data.translateY;
		if (data.scaleX !== undefined) this._matrix.scaleX = data.scaleX;
		if (data.scaleY !== undefined) this._matrix.scaleY = data.scaleY;
		if (data.shearX !== undefined) this._matrix.shearX = data.shearX;
		if (data.shearY !== undefined) this._matrix.shearY = data.shearY;
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
			this.rotate = data.rotate;
		}
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

	// ─── Event emission (Internal, used by legacy methods) ──────────────────

	private emit(operation: TransformationOperation): void {
		if (this.events) {
			const command = new TransformationCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	// ─── Legacy emit methods (Internal, use transformOps instead) ────────────

	private emitMatrix(matrix: MatrixData, timeStamp?: number): void {
		this.emit({
			class: 'Transformation',
			method: 'applyMatrix',
			items: [{ id: this.id, matrix }],
			timeStamp,
		});
	}

	private translateTo(x: number, y: number, timeStamp?: number): void {
		this.emitMatrix({
			translateX: x - this._matrix.translateX,
			translateY: y - this._matrix.translateY,
			scaleX: 1,
			scaleY: 1,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	private translateBy(x: number, y: number, timeStamp?: number): void {
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

	private scaleTo(x: number, y: number, timeStamp?: number): void {
		this.emitMatrix({
			translateX: 0,
			translateY: 0,
			scaleX: x / this._matrix.scaleX,
			scaleY: y / this._matrix.scaleY,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	private scaleBy(x: number, y: number, timeStamp?: number): void {
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

	private scaleByTranslateBy(
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

	private rotateTo(degree: number, timeStamp?: number): void {
		this.emit({
			class: 'Transformation',
			method: 'rotateTo',
			item: [this.id],
			degree,
			timeStamp,
		});
	}

	private rotateBy(degree: number, timeStamp?: number): void {
		this.emit({
			class: 'Transformation',
			method: 'rotateBy',
			item: [this.id],
			degree,
			timeStamp,
		});
	}

	setIsLocked(isLocked: boolean): void {
		this.emit({
			class: 'Transformation',
			method: isLocked ? 'locked' : 'unlocked',
			item: [this.id],
			locked: isLocked,
		});
	}

	private scaleToRelativeTo(x: number, y: number, _point: Point, timeStamp?: number): void {
		this.emitMatrix({
			translateX: 0,
			translateY: 0,
			scaleX: x / this._matrix.scaleX,
			scaleY: y / this._matrix.scaleY,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	private scaleByRelativeTo(x: number, y: number, point: Point, timeStamp?: number): void {
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

	private applyMatrix(matrixData: MatrixData): void {
		this._matrix.scale(matrixData.scaleX, matrixData.scaleY);
		this._matrix.translate(matrixData.translateX, matrixData.translateY);
	}

	private applyIsLocked(isLocked: boolean): void {
		this.isLocked = isLocked;
	}

	// ─── Apply (called by command system, not directly) ───────────────────────

	apply(op: TransformationOperation | LocalTransformationOperation): void {
		this.previous = this._matrix.copy();
		switch (op.method) {
			case 'setLocalMatrix':
				this.applyLocalMatrix(new Matrix(
					op.matrix.translateX,
					op.matrix.translateY,
					op.matrix.scaleX,
					op.matrix.scaleY,
					op.matrix.shearX,
					op.matrix.shearY
				));
				break;
			case 'setLocal':
				this.applyLocal(op.data);
				break;
			case 'applyMatrix': {
				const itemOp = op.items.find(i => i.id === this.id);
				if (itemOp) {
					this.applyMatrix(itemOp.matrix);
				}
				break;
			}
			case 'rotateTo':
				this.applyRotateTo(op.degree);
				break;
			case 'rotateBy':
				this.applyRotateBy(op.degree);
				break;
			case 'transformMany':
				const subOp = op.items[this.id];
				if (subOp) {
					this.applyTransformMany(subOp);
				}
				break;
			case 'locked':
				this.applyIsLocked(op.locked);
				break;
			case 'unlocked':
				this.applyIsLocked(op.locked);
				break;
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
			case 'scaleByTranslateBy':
				this.applyScaleBy(this.previous.scaleX * op.scale.x, this.previous.scaleY * op.scale.y); // actually this is weird but following legacy
				this.applyTranslateBy(op.translate.x, op.translate.y);
				break;
				return;
		}
	}


	// ─── Legacy apply helpers (for replaying old events) ─────────────────────

	private applyTransformMany(op: ApplyMatrixOperation | any): void {
		if (op.method === 'applyMatrix') {
			const itemOp = op.items.find((i: ApplyMatrixItem) => i.id === this.id);
			if (itemOp) {
				this._matrix.scale(itemOp.matrix.scaleX, itemOp.matrix.scaleY);
				this._matrix.translate(
					itemOp.matrix.translateX,
					itemOp.matrix.translateY
				);
			}
		}
	}

	private applyTranslateTo(x: number, y: number): void {
		this._matrix.translateX = x;
		this._matrix.translateY = y;
	}

	private applyTranslateBy(x: number, y: number): void {
		this._matrix.translate(x, y);
	}

	private applyScaleTo(x: number, y: number): void {
		this._matrix.scaleX = x;
		this._matrix.scaleY = y;
	}

	private applyScaleBy(x: number, y: number): void {
		this._matrix.scale(x, y);
	}

	private applyScaleByRelativeTo(x: number, y: number, point: { x: number; y: number }): void {
		const scaleX = this._matrix.scaleX * x;
		const scaleY = this._matrix.scaleY * y;
		this._matrix.translateX = -point.x * scaleX + point.x;
		this._matrix.translateY = -point.y * scaleY + point.y;
		this._matrix.scaleX = scaleX;
		this._matrix.scaleY = scaleY;
	}

	private applyScaleToRelativeTo(x: number, y: number, point: { x: number; y: number }): void {
		this._matrix.translate(-point.x, -point.y);
		this._matrix.scaleX = x;
		this._matrix.scaleY = y;
		this._matrix.translate(point.x, point.y);
	}

	private applyRotateTo(degree: number): void {
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
	}

	private applyRotateBy(degree: number): void {
		this.applyRotateTo(this.rotate + degree);
	}
}
