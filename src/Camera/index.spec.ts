import { describe, it, expect } from 'bun:test';
import { Pointer } from 'Pointer';
import { Camera } from './Camera';

describe('to view the diagram, a user', () => {
	it('zooms in to pointer', () => {
		const view = new Camera();
		view.pointTo(10, 10);
		view.zoomRelativeToPointBy(2, 10, 10, 0);
		expect(view.getScale()).toBe(2);
	});
	it('points to the board', () => {
		const pointer = new Pointer();
		const view = new Camera(pointer);
		view.zoomRelativeToPointBy(2, 0, 0, 0);
		view.pointTo(10, 10);
		expect(pointer.point.x).toBe(5);
		expect(pointer.point.y).toBe(5);
	});
});
