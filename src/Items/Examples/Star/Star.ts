import {
	BaseItem,
	BaseItemData,
	SerializedItemData,
} from "Items/BaseItem/BaseItem";
import { Board } from "Board";
import { DrawingContext } from "Items/DrawingContext";
import { DocumentFactory } from "api/DocumentFactory";
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

export class Star extends BaseItem {
	readonly itemType = "Star";
	private path: Path;
	readonly subject = new Subject<Star>();
	private borderWidth = 1;
	isShining = false;

	constructor(board: Board, id = "") {
		super(board, id, defaultStarData);
		this.path = starPath.copy();
		this.transformPath();

		this.transformation.subject.subscribe(() => {
			this.transformPath();
			this.updateMbr();
			this.subject.publish(this);
		});

		this.updateMbr();
	}

	private transformPath(): void {
		this.path = starPath.copy();
		this.path.transform(this.transformation.matrix);

		this.path.setBackgroundColor(this.backgroundColor);
		this.path.setBorderColor(this.borderColor);
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
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
	}

	getPath(): Path | Paths {
		return this.path.copy();
	}

	renderHTML(documentFactory: DocumentFactory): HTMLElement {
		const div = documentFactory.createElement("star-item");
		const { translateX, translateY, scaleX, scaleY } =
			this.transformation.matrix;
		const mbr = this.getMbr();
		const unscaledWidth = mbr.getWidth() / scaleX;
		const unscaledHeight = mbr.getHeight() / scaleY;

		const svg = documentFactory.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg",
		);
		svg.setAttribute("width", `${unscaledWidth}px`);
		svg.setAttribute("height", `${unscaledHeight}px`);
		svg.setAttribute("viewBox", `0 0 ${unscaledWidth} ${unscaledHeight}`);
		svg.setAttribute("transform-origin", "0 0");
		svg.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);
		svg.setAttribute("style", "position: absolute; overflow: visible;");

		const pathElement = this.path.renderHTML(documentFactory);
		svg.appendChild(pathElement);
		div.appendChild(svg);

		div.id = this.getId();
		div.style.width = `${unscaledWidth}px`;
		div.style.height = `${unscaledHeight}px`;
		div.style.transformOrigin = "left top";
		div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
		div.style.position = "absolute";

		return div;
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

	apply(op: StarOperation): void {
		super.apply(op);
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
