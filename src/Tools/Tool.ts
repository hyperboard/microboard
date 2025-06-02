import { DrawingContext } from 'Items/DrawingContext';

export class Tool {
	leftButtonDown(): boolean {
		return false;
	}
	leftButtonUp(): boolean {
		return false;
	}
	leftButtonDouble(): boolean {
		return false;
	}
	rightButtonDown(): boolean {
		return false;
	}
	rightButtonUp(): boolean {
		return false;
	}
	rightButtonDouble(): boolean {
		return false;
	}
	middleButtonDown(): boolean {
		return false;
	}
	middleButtonUp(): boolean {
		return false;
	}
	middleButtonDouble(): boolean {
		return false;
	}
	keyDown(_key: string): boolean {
		return false;
	}
	keyUp(_key: string): boolean {
		return false;
	}
	pointerMoveBy(_x: number, _y: number): boolean {
		return false;
	}
	onCancel(): void {}
	onConfirm(): void {}
	render(_context: DrawingContext): void {}
}
