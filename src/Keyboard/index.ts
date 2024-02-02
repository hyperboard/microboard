export class Keyboard {
	up = "";
	down = "";
	isShift = false;
	isCtrl = false;
	isAlt = false;
	isCmd = false;

	keyDown(event: KeyboardEvent): void {
		this.down = event.key;
		this.isShift = event.shiftKey;
		this.isAlt = event.altKey;
		this.isCtrl = event.ctrlKey;

		this.isCmd = event.metaKey || event.key === "Meta";
    if (navigator.platform.match("Mac") && this.isCmd) {
        this.isCtrl = true;
    }
	}

	keyUp(event: KeyboardEvent): void {
		this.up = event.key;
		this.isShift = event.shiftKey;
		this.isAlt = event.altKey;
		this.isCtrl = event.ctrlKey;
	}
}
