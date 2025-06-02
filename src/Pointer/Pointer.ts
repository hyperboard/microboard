import { Point, Matrix } from 'Items';
import { Subject } from 'Subject';
import { CursorsMap, CursorName, Cursor } from './Cursor';

export const cursorsMap: CursorsMap = {};
export class Pointer {
	readonly point = new Point();
	readonly subject: Subject<Pointer> = new Subject<Pointer>();

	previous = new Point();
	delta = new Point();

	private cursor = 'default';

	setCursor(cursor: CursorName): void {
		if (this.cursor !== cursor) {
			if (cursor in cursorsMap) {
				this.cursor = cursorsMap[cursor] as Cursor;
			} else {
				this.cursor = cursor;
			}
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
