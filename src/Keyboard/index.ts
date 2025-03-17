export class Keyboard {
	up = "";
	down = "";
	isShift = false;
	isCtrl = false;
	isAlt = false;
	isCmd = false;
	isSpacePressed = false;
	activeKeys = new Set();

	keyDown(event: KeyboardEvent): void {
		this.down = event.key;
		this.isShift = event.shiftKey;
		this.isAlt = event.altKey;
		this.isCtrl = event.ctrlKey;
		this.activeKeys.add(event.key);

		this.isCmd = event.metaKey || event.key === "Meta";
		if (navigator.platform.match("Mac") && this.isCmd) {
			this.isCtrl = true;
		}

		if (event.code === "Space") {
			this.isSpacePressed = true;
		}
	}

	keyUp(event: KeyboardEvent): void {
		this.up = event.key;
		this.isShift = event.shiftKey;
		this.isAlt = event.altKey;
		this.isCtrl = event.ctrlKey;
		this.isCmd = event.metaKey;
		this.activeKeys.delete(event.key);

		if (!this.isCmd || event.key === "Meta" || event.key === "Control") {
			this.isCtrl = false;
			this.isCmd = false;
		}
		if (event.code === "Space") {
			this.isSpacePressed = false;
		}
	}
}

export { isHotkeyPushed } from "./isHotkeyPushed";
export { checkHotkeys } from "./checkHotkeys";
export { getHotkeyLabel } from "./getHotkeyLabel";
export { isControlCharacter } from "./isControlCharacter";
