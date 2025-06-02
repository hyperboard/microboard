export function safeRequestAnimationFrame(callback: (time?: number) => void) {
	if (typeof requestAnimationFrame === 'function') {
		return requestAnimationFrame(callback);
	} else {
		callback();
	}
}
