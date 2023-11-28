export class Keyboard {
	up = "";
	down = "";
	isShift = false;
	isCtrl = false;
	isAlt = false;

	keyDown(event: KeyboardEvent): void {
		this.down = event.key;
		this.isShift = event.shiftKey;
		this.isAlt = event.altKey;
		this.isCtrl = event.ctrlKey;
	}

	keyUp(event: KeyboardEvent): void {
		this.up = event.key;
		this.isShift = event.shiftKey;
		this.isAlt = event.altKey;
		this.isCtrl = event.ctrlKey;
	}
}
