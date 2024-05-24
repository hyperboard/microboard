import { Point } from "../Point";
import { Matrix } from "./Matrix";
import { TransformationOperation } from "./TransformationOperations";
import {
	TransformationData,
	DefaultTransformationData,
} from "./TransformationData";
import { Events, Operation } from "../../Events";
import { TransformationCommand } from "./TransformationCommand";
import { SubjectOperation } from "SubjectOperation";
import { time, timeStamp } from "console";

const defaultData = new DefaultTransformationData();

export class Transformation {
	readonly subject = new SubjectOperation<
		Transformation,
		TransformationOperation
	>();
	matrix = new Matrix();
	previous = new Matrix();
	private rotate = defaultData.rotate;

	constructor(private id = "", private events?: Events) {}

	serialize(): TransformationData {
		return {
			translateX: this.matrix.translateX,
			translateY: this.matrix.translateY,
			scaleX: this.matrix.scaleX,
			scaleY: this.matrix.scaleY,
			rotate: this.rotate,
		};
	}

	deserialize(data: TransformationData): this {
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
		if (data.rotate) {
			// TODO to rotate to a degree calculate rotation by
			this.matrix.rotateBy(data.rotate);
		}
		this.subject.publish(this, {
			class: "Transformation",
			method: "deserialize",
			item: [this.id],
			data,
		});
		return this;
	}

	copy(id?: string): Transformation {
		const { translateX, translateY, scaleX, scaleY } = this.matrix;
		const { rotate } = this;
		return new Transformation(id || "", this.events).deserialize({
			translateX,
			translateY,
			scaleX,
			scaleY,
			rotate,
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
			case "translateTo":
				this.applyTranslateTo(op.x, op.y);
				break;
			case "translateBy":
				this.applyTranslateBy(op.x, op.y);
				break;
			case "scaleTo":
				this.applyScaleTo(op.x, op.y);
				break;
			case "scaleBy":
				this.applyScaleBy(op.x, op.y);
				break;
			case "scaleToRelativeTo":
				this.applyScaleToRelativeTo(op.x, op.y, op.point);
				break;
			case "scaleByRelativeTo":
				this.applyScaleByRelativeTo(op.x, op.y, op.point);
				break;
			case "rotateTo":
				this.applyRotateTo(op.degree);
				break;
			case "rotateBy":
				this.applyRotateBy(op.degree);
				break;
			case "scaleByTranslateBy":
				this.applyScaleByTranslateBy(op.scale, op.translate);
				break;
			case "transformMany":
				this.applyTransformMany(op.items[this.id]);
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
		translate: { x: number; y: number },
	): void {
		this.matrix.scale(scale.x, scale.y);
		this.matrix.translate(translate.x, translate.y);
	}

	applyTransformMany(op: TransformationOperation): void {
		if (op.method === "scaleByTranslateBy") {
			this.applyScaleByTranslateBy(op.scale, op.translate);
		} else if (op.method === "scaleBy") {
			this.applyScaleBy(op.x, op.y);
		} else if (op.method === "translateBy") {
			this.applyTranslateBy(op.x, op.y);
		}
	}

	applyScaleByRelativeTo(
		x: number,
		y: number,
		point: { x: number; y: number },
	): void {
		const scaleX = this.matrix.scaleX * x;
		const scaleY = this.matrix.scaleY * y;
		this.matrix.translateX = -point.x * scaleX + point.x;
		this.matrix.translateY = -point.y * scaleY + point.y;
		this.matrix.scaleX = scaleX;
		this.matrix.scaleY = scaleY;
	}

	applyScaleToRelativeTo(
		x: number,
		y: number,
		point: { x: number; y: number },
	): void {
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
		this.matrix.rotateBy(degree);
	}

	applyRotateBy(degree: number): void {
		this.rotateTo(this.rotate + degree);
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

	translateTo(x: number, y: number, timeStamp?: number): void {
		if (!this.id) {
			// TODO console.warn("Transformation.translateTo() has no itemId");
		}
		this.emit({
			class: "Transformation",
			method: "translateTo",
			item: [this.id],
			x,
			y,
			timeStamp,
		});
	}

	translateBy(x: number, y: number, timeStamp?: number): void {
		if (!this.id) {
			// TODO console.warn("Transformation.translateTo() has no itemId");
		}
		this.emit({
			class: "Transformation",
			method: "translateBy",
			item: [this.id],
			x,
			y,
			timeStamp,
		});
	}

	scaleTo(x: number, y: number, timeStamp?: number): void {
		this.emit({
			class: "Transformation",
			method: "scaleTo",
			item: [this.id],
			x,
			y,
			timeStamp,
		});
	}

	scaleBy(x: number, y: number, timeStamp?: number): void {
		this.emit({
			class: "Transformation",
			method: "scaleBy",
			item: [this.id],
			x,
			y,
			timeStamp,
		});
	}

	scaleByTranslateBy(
		scale: { x: number; y: number },
		translate: { x: number; y: number },
		timeStamp?: number,
	): void {
		this.emit({
			class: "Transformation",
			method: "scaleByTranslateBy",
			item: [this.id],
			scale,
			translate,
			timeStamp,
		});
	}

	rotateTo(degree: number, timeStamp?: number): void {
		this.emit({
			class: "Transformation",
			method: "rotateTo",
			item: [this.id],
			degree,
			timeStamp,
		});
	}

	rotateBy(degree: number, timeStamp?: number): void {
		this.emit({
			class: "Transformation",
			method: "rotateBy",
			item: [this.id],
			degree,
			timeStamp,
		});
	}

	scaleToRelativeTo(
		x: number,
		y: number,
		point: Point,
		timeStamp?: number,
	): void {
		this.emit({
			class: "Transformation",
			method: "scaleToRelativeTo",
			item: [this.id],
			x,
			y,
			point,
			timeStamp,
		});
	}

	scaleByRelativeTo(
		x: number,
		y: number,
		point: Point,
		timeStamp?: number,
	): void {
		this.emit({
			class: "Transformation",
			method: "scaleByRelativeTo",
			item: [this.id],
			x,
			y,
			point,
			timeStamp,
		});
	}
}
