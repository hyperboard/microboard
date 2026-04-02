import {
	BaseItem,
	BaseItemData,
	SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { DrawingContext } from "Items/DrawingContext";
import { Point } from "Items/Point/Point";
import { BorderStyle, BorderWidth, Path } from "Items/Path/Path";
import { Line } from "Items/Line/Line";
import { Subject } from "Subject";
import { TransformationData } from "Items/Transformation/TransformationData";
import { Paths } from "Items/Path/Paths";
import { registerItem } from "Items/RegisterItem";
import { AddStar } from "./AddStar";
import { StarOperation } from "Items/Examples/Star/StarOperation";

export interface StarData {
	readonly itemType: "Star";
	backgroundColor: string;
	backgroundOpacity: number;
	borderColor: string;
	borderOpacity: number;
	borderStyle: BorderStyle;
	borderWidth: BorderWidth;
	transformation: TransformationData;
	linkTo?: string;
}

export const defaultStarData: BaseItemData = {
	itemType: "Star",
	backgroundColor: "#1f1255",
	backgroundOpacity: 1,
	borderColor: "#000207",
	borderOpacity: 1,
	borderStyle: "solid",
	borderWidth: 1,
};

const starPath = new Path(
	[
		new Line(new Point(0, 35), new Point(35, 35)),
		new Line(new Point(35, 35), new Point(50, 0)),
		new Line(new Point(50, 0), new Point(65, 35)),
		new Line(new Point(65, 35), new Point(100, 35)),
		new Line(new Point(100, 35), new Point(75, 60)),
		new Line(new Point(75, 60), new Point(90, 95)),
		new Line(new Point(90, 95), new Point(50, 75)),
		new Line(new Point(50, 75), new Point(10, 95)),
		new Line(new Point(10, 95), new Point(25, 60)),
		new Line(new Point(25, 60), new Point(0, 35)),
	],
	true,
);

export class Star extends BaseItem<Star> {
	readonly itemType = "Star";
	private path: Path;
	readonly subject = new Subject<Star>();
	private borderWidth = 1;
	public backgroundColor: string = defaultStarData.backgroundColor as string;
	public borderColor: string = defaultStarData.borderColor as string;
	public borderStyle: BorderStyle = defaultStarData.borderStyle as BorderStyle;
	isShining = false;

	constructor(board: Board, id = "") {
		super(board, id);
		this.path = starPath.copy();
		this.transformPath();


		this.updateMbr();
	}

	private transformPath(): void {
		this.path = starPath.copy();
		this.path.transform(this.transformation.toMatrix());

		this.path.setBackgroundColor(this.backgroundColor as any);
		this.path.setBorderColor(this.borderColor as any);
		this.path.setBorderWidth(this.borderWidth);
		this.path.setBorderStyle(this.borderStyle);
	}

	render(context: DrawingContext): void {
		if (this.transformationRenderBlock) {
			return;
		}
		this.path.render(context);
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
		const { left, top, right, bottom } = this.path.getMbr();
		this.mbr.left = left;
		this.mbr.right = right;
		this.mbr.top = top;
		this.mbr.bottom = bottom;
	}

	getPath(): Path | Paths {
		return this.path.copy();
	}


	deserialize(data: SerializedItemData): this {
		super.deserialize(data);

		this.transformPath();
		this.subject.publish(this);
		return this;
	}

	isClosed(): boolean {
		return true;
	}

	toggleIsShining(): void {
		this.emit({
			class: "Star",
			method: "toggleShine",
			item: [this.getId()],
			prevData: { isShining: this.isShining },
			newData: { isShining: !this.isShining },
		});
	}

	apply(op: any): void {
		super.apply(op);
		if (op.class === "Transformation") {
			this.transformPath();
			this.updateMbr();
		}
		switch (op.class) {
			case "Star":
				switch (op.method) {
					case "toggleShine":
						if (!this.isShining) {
							this.backgroundColor = "#ddc990";
							this.borderColor = "#f6bb0e";
						} else {
							this.backgroundColor = "#1f1255";
							this.borderColor = "#000207";
						}
						this.isShining = op.newData.isShining;
						this.transformPath();
				}
				break;
		}
		this.subject.publish(this);
	}
}

registerItem({
	item: Star,
	defaultData: defaultStarData,
	toolData: { name: "AddStar", tool: AddStar },
});
