import { Point, Matrix } from "Board/Items";
import { Cursor } from "./Cursor";
import { Subject } from "../../Subject";

export class Pointer {
	readonly point = new Point();
	readonly subject: Subject<Pointer> = new Subject<Pointer>();

	previous = new Point();
	delta = new Point();

	private cursor: Cursor = "default";

	setCursor(cursor: Cursor): void {
		if (this.cursor !== cursor) {
			this.cursor = cursor;
			this.subject.publish(this);
		}
	}

	getCursor(): Cursor {
		return this.cursor;
	}

	pointTo(x: number, y: number): void {
		this.previous.x = this.point.x;
		this.previous.y = this.point.y;
		this.delta.x = x - this.point.x;
		this.delta.y = y - this.point.y;
		this.point.x = x;
		this.point.y = y;
	}

	moveBy(x: number, y: number): void {
		this.point.transform(new Matrix(x, y));
	}
}
