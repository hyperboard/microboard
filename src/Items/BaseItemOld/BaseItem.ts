import { Matrix } from ".";
import { Mbr, RichText } from "..";
import { ResizeOp } from "./BaseItemOperation";

export class BaseItemOld extends Mbr {
	matrix = new Matrix();
	previous = new Matrix();
	isLocked = false;
	link: string | null = null;

	constructor(private id = "") {
		super();
	}

	getId(): string {
		return this.id;
	}

	setId(id: string): this {
		this.id = id;
		this.getRichText()?.setId(id);
		return this;
	}

	/** Get RichText handle if exists */
	getRichText(): RichText | null {
		return null;
	}

	/** Get link from this item to another item */
	getLinkFromItem(): string | null {
		return this.link;
	}

	setLinkFromItem(link: string): void {
		this.link = link;
	}

	/** Get link to this */
	getLinkToItem(): string {
		return `${window.location.origin}${
			window.location.pathname
		}?focus=${this.getId()}`;
	}

	isOnlyProportionalScalingAllowed(): boolean {
		return false;
	}

	transform(matrix: Matrix): void {
		this.matrix.multiplyByMatrix(matrix);
	}

	resize(data: ResizeOp): void {
		const itemMbr = this.getMbr();

		this.matrix.scaleX *= data.matrix.scaleX;
		this.matrix.scaleY *= data.matrix.scaleY;

		const deltaX = itemMbr.left - data.mbrBefore.left;
		const deltaY = itemMbr.top - data.mbrBefore.top;

		this.matrix.translateX +=
			deltaX * data.matrix.scaleX - deltaX + data.matrix.translateX;
		this.matrix.translateY +=
			deltaY * data.matrix.scaleY - deltaY + data.matrix.translateY;
	}

	setLock(isLocked: boolean): void {
		this.isLocked = isLocked;
	}
}
