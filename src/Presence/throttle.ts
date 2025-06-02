export function throttle<T extends (...args: any[]) => unknown>(
	func: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let lastCall = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return function (...args: Parameters<T>) {
		const now = Date.now();

		if (lastCall + delay <= now) {
			lastCall = now;
			func(...args);
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		} else if (!timeoutId) {
			timeoutId = setTimeout(
				() => {
					lastCall = Date.now();
					timeoutId = null;
					func(...args);
				},
				delay - (now - lastCall),
			);
		}
	};
}

export function throttleWithDebounce<
	T extends (...args: Parameters<T>) => void,
>(fn: T, throttleDelay: number, debounceDelay: number): T {
	let lastThrottleTime = 0;
	let debounceTimeout: NodeJS.Timeout | number | null = null;
	let lastArgs: Parameters<T> | null = null;

	return function (...args: Parameters<T>) {
		const now = Date.now();
		const timeSinceLastThrottle = now - lastThrottleTime;

		if (timeSinceLastThrottle >= throttleDelay) {
			fn(...args);
			lastThrottleTime = now;
		} else {
			lastArgs = args;
		}

		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}
		debounceTimeout = setTimeout(() => {
			if (lastArgs) {
				fn(...(lastArgs as Parameters<T>));
				lastArgs = null;
			}
		}, debounceDelay);
	} as T;
}
