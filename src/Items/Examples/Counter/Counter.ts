import {
	BaseItem,
	BaseItemData,
	SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { DrawingContext } from "Geometry/DrawingContext";
import { Point } from "Geometry/Point/Point";
import { Path } from "Geometry/Path/Path";
import { Line } from "Geometry/Line/Line";
import { Subject } from "Subject";
import { Paths } from "Geometry/Path/Paths";
import { registerItem } from "Items/RegisterItem";
import { AddCounter } from "Items/Examples/Counter/AddCounter";
import { CounterOperation } from "Items/Examples/Counter/CounterOperation";

export const defaultCounterData: BaseItemData = {
	itemType: "Counter",
	count: 0,
};

export const COUNTER_DIMENSIONS = { width: 200, height: 200 };

export class Counter extends BaseItem<Counter> {
	private count = 0;
	readonly subject = new Subject<Counter>();
	shouldUseCustomRender = true;

	constructor(board: Board, id = "") {
		super(board, id);

		this.updateMbr();

		this.updateMbr();
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		const ctx = context.ctx;
		ctx.save();
		ctx.globalCompositeOperation = "destination-out";
		ctx.fillRect(this.mbr.left, this.mbr.top, this.getWidth(), this.getHeight());
		ctx.restore();
		if (this.getLinkTo()) {
			const { top, right } = this.getMbr();
			this.linkTo.render(
				context,
				top,
				right,
				this.board.camera.getScale(),
			);
		}
	}

	updateMbr(): void {
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.getMatrixData();
		this.mbr.left = translateX;
		this.mbr.top = translateY;
		this.mbr.right = this.mbr.left + COUNTER_DIMENSIONS.width * scaleX;
		this.mbr.bottom = this.mbr.top + COUNTER_DIMENSIONS.height * scaleY;
	}

	getPath(): Path | Paths {
		const { top, right, bottom, left } = this.getMbr();
		return new Path([
			new Line(new Point(left, top), new Point(right, top)),
			new Line(new Point(right, top), new Point(right, bottom)),
			new Line(new Point(right, bottom), new Point(left, bottom)),
			new Line(new Point(left, bottom), new Point(left, top)),
		]);
	}


	deserialize(data: SerializedItemData): this {
		super.deserialize(data);

		this.updateMbr();
		this.subject.publish(this);
		return this;
	}

	getCount(): number {
		return this.count;
	}

	setCount(count: number): void {
		this.emit({
			class: "Counter",
			method: "updateCounter",
			item: [this.getId()],
			newData: { count },
			prevData: { count: this.count },
		});
	}

	apply(op: CounterOperation): void {
		switch (op.class) {
			case "Transformation":
				super.apply(op);
				this.updateMbr();
				break;
			case "Counter":
				super.apply(op);
				switch (op.method) {
					case "updateCounter":
						this.count = op.newData.count;
				}
				break;
		}
		this.subject.publish(this);
	}
}

registerItem({
	item: Counter,
	defaultData: defaultCounterData,
	toolData: { name: "AddCounter", tool: AddCounter },
});
