export function safeRequestAnimationFrame(callback) {
	if (typeof requestAnimationFrame === "function") {
		return requestAnimationFrame(callback);
	} else {
		setTimeout(callback);
		return null;
	}
}
