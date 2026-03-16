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
	matrix = new Matrix();
	previous = new Matrix();
	private rotate = defaultData.rotate;
	isLocked = false;

	constructor(private id = '', private events?: Events) {}

	serialize(): TransformationData {
		return {
			translateX: this.matrix.translateX,
			translateY: this.matrix.translateY,
			scaleX: this.matrix.scaleX,
			scaleY: this.matrix.scaleY,
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
		this.previous = this.matrix.copy();
		if (data.translateX) {
			this.matrix.translateX = data.translateX;
		}
		if (data.translateY) {
			this.matrix.translateY = data.translateY;
		}
		if (data.scaleX) {
			this.matrix.scaleX = data.scaleX;
		}
		if (data.scaleY) {
			this.matrix.scaleY = data.scaleY;
		}
		if (data.isLocked) {
			this.isLocked = data.isLocked;
		}
		if (data.rotate) {
			// TODO to rotate to a degree calculate rotation by
			// if (data.dimension) {
			// 	this.matrix.rotateByObjectCenter(
			// 		data.rotate,
			// 		{
			// 			width: data.dimension.width,
			// 			height: data.dimension.height,
			// 		},
			// 		{ x: data.scaleX, y: data.scaleY }
			// 	);
			// } else {
			// 	this.matrix.rotateBy(data.rotate);
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
		const { translateX, translateY, scaleX, scaleY } = this.matrix;
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

	emit(operation: TransformationOperation): void {
		if (this.events) {
			const command = new TransformationCommand([this], operation);
			command.apply();
			this.events.emit(operation, command);
		} else {
			this.apply(operation);
		}
	}

	setId(id: string): void {
		this.id = id;
	}

	apply(op: Operation): void {
		this.previous = this.matrix.copy();
		switch (op.method) {
			case 'applyMatrix': {
				const itemOp = op.items.find(i => i.id === this.id);
				if (itemOp) {
					this.matrix.scale(itemOp.matrix.scaleX, itemOp.matrix.scaleY);
					this.matrix.translate(itemOp.matrix.translateX, itemOp.matrix.translateY);
				}
				break;
			}
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
			case 'rotateTo':
				this.applyRotateTo(op.degree);
				break;
			case 'rotateBy':
				this.applyRotateBy(op.degree);
				break;
			case 'scaleByTranslateBy':
				this.applyScaleByTranslateBy(op.scale, op.translate);
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

	applyTranslateTo(x: number, y: number): void {
		this.matrix.translateX = x;
		this.matrix.translateY = y;
	}

	applyTranslateBy(x: number, y: number): void {
		this.matrix.translate(x, y);
	}

	applyScaleTo(x: number, y: number): void {
		this.matrix.scaleX = x;
		this.matrix.scaleY = y;
	}

	applyScaleBy(x: number, y: number): void {
		this.matrix.scale(x, y);
	}

	applyScaleByTranslateBy(
		scale: { x: number; y: number },
		translate: { x: number; y: number }
	): void {
		this.matrix.scale(scale.x, scale.y);
		this.matrix.translate(translate.x, translate.y);
	}

	applyTransformMany(op: TransformationOperation): void {
		if (op.method === 'applyMatrix') {
			this.matrix.scale(op.matrix.scaleX, op.matrix.scaleY);
			this.matrix.translate(op.matrix.translateX, op.matrix.translateY);
		} else if (op.method === 'scaleByTranslateBy') {
			this.applyScaleByTranslateBy(op.scale, op.translate);
		} else if (op.method === 'scaleBy') {
			this.applyScaleBy(op.x, op.y);
		} else if (op.method === 'translateBy') {
			this.applyTranslateBy(op.x, op.y);
		} else if (op.method === "translateTo") {
			this.applyTranslateTo(op.x, op.y);
		}
	}

	applyScaleByRelativeTo(x: number, y: number, point: { x: number; y: number }): void {
		const scaleX = this.matrix.scaleX * x;
		const scaleY = this.matrix.scaleY * y;
		this.matrix.translateX = -point.x * scaleX + point.x;
		this.matrix.translateY = -point.y * scaleY + point.y;
		this.matrix.scaleX = scaleX;
		this.matrix.scaleY = scaleY;
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
		// this.matrix.rotateBy(degree);
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

	getTranslation(): { x: number; y: number } {
		return { x: this.matrix.translateX, y: this.matrix.translateY };
	}

	getScale(): { x: number; y: number } {
		return { x: this.matrix.scaleX, y: this.matrix.scaleY };
	}

	getRotation(): number {
		return this.rotate;
	}

	getInverse(): Transformation {
		const copy = this.copy();
		copy.matrix.invert();
		return copy;
	}

	getId(): string {
		return this.id;
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
			translateX: x - this.matrix.translateX,
			translateY: y - this.matrix.translateY,
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
			scaleX: x / this.matrix.scaleX,
			scaleY: y / this.matrix.scaleY,
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
		// applyScaleToRelativeTo translates cancel out; net effect is scaleTo
		this.emitMatrix({
			translateX: 0,
			translateY: 0,
			scaleX: x / this.matrix.scaleX,
			scaleY: y / this.matrix.scaleY,
			shearX: 0,
			shearY: 0,
		}, timeStamp);
	}

	scaleByRelativeTo(x: number, y: number, point: Point, timeStamp?: number): void {
		const { scaleX: sx0, scaleY: sy0, translateX: tx0, translateY: ty0 } = this.matrix;
		const newSx = sx0 * x;
		const newSy = sy0 * y;
		// target absolute state after applyScaleByRelativeTo:
		//   tx = -point.x * newSx + point.x
		//   ty = -point.y * newSy + point.y
		// delta (applied as scale then translate):
		//   after scale: sx = newSx, tx = tx0
		//   after translate(dtx): tx = tx0 + dtx = target_tx
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
		this.previous = this.matrix.copy();
		this.matrix.scale(matrixData.scaleX, matrixData.scaleY);
		this.matrix.translate(matrixData.translateX, matrixData.translateY);
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
}
