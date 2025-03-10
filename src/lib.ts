export function isFiniteNumber(value: unknown): boolean {
	return typeof value === "number" && isFinite(value);
}

export function toFiniteNumber(value: unknown, coerce = 0): number {
	return isFiniteNumber(value) ? (value as number) : coerce;
}

export function isNumberEven(number: number): boolean {
	return number !== 0 && number % 2 === 0;
}

export function isNumberEvenOrZero(number: number): boolean {
	return number % 2 === 0;
}

export function isNumberOdd(number: number): boolean {
	return number % 2 !== 0;
}

export function getRandomNumber(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

export function forceNumberIntoInterval(
	number: number,
	min: number,
	max: number,
): number {
	// same as return Math.min (max, Math.max (min, number));
	// same as return Math.max (min, Math.min (max, number));
	return number < min ? min : number > max ? max : number;
}

function isEqual(x: unknown, y: unknown): boolean {
	if (x === y) {
		return x !== 0 || y !== 0 || 1 / x === 1 / y;
	} else {
		return x !== x && y !== y;
	}
}

interface MapStringUnknown {
	[key: string]: unknown;
}

/*
	Returns true if isObject and toObject have the same properties.
*/

export function isShallowEqualTo(
	isObject: unknown,
	toObject: unknown,
): boolean {
	if (isEqual(isObject, toObject)) {
		return true;
	}

	if (
		typeof isObject !== "object" ||
		isObject === null ||
		typeof toObject !== "object" ||
		toObject === null
	) {
		return false;
	}

	const keysA = Object.keys(isObject);
	const keysB = Object.keys(toObject);

	if (keysA.length !== keysB.length) {
		return false;
	}

	for (let i = 0; i < keysA.length; i++) {
		if (
			!Object.prototype.hasOwnProperty.call(toObject, keysA[i]) ||
			!isEqual(
				(isObject as MapStringUnknown)[keysA[i]],
				(toObject as MapStringUnknown)[keysA[i]],
			)
		) {
			return false;
		}
	}

	return true;
}

/*
	Returns true if isObject has all the properties that toObject has.
*/

export function isShallowSimilarTo(
	isObject: unknown,
	toObject: unknown,
): boolean {
	if (isEqual(isObject, toObject)) {
		return true;
	}

	if (
		typeof isObject !== "object" ||
		isObject === null ||
		typeof toObject !== "object" ||
		toObject === null
	) {
		return false;
	}

	const keysA = Object.keys(isObject);
	const keysB = Object.keys(toObject);

	if (keysA.length > keysB.length) {
		return false;
	}

	for (let i = 0; i < keysA.length; i++) {
		if (
			!Object.prototype.hasOwnProperty.call(toObject, keysA[i]) ||
			!isEqual(
				(isObject as MapStringUnknown)[keysA[i]],
				(toObject as MapStringUnknown)[keysA[i]],
			)
		) {
			return false;
		}
	}

	return true;
}

export type PublicInterfaceOf<T> = { [K in keyof T]: T[K] };

export function omitDefaultProperties<Type>(
	defaultObject: Type,
	fullObject: Type,
): Partial<Type> {
	if (
		typeof defaultObject !== "object" ||
		Array.isArray(defaultObject) ||
		!defaultObject ||
		typeof fullObject === "object" ||
		Array.isArray(fullObject) ||
		!fullObject
	) {
		throw new Error(
			"Omit default properties of an object. Argument is not an object.",
		);
	}
	const partialObject: Partial<Type> = {};
	for (const key in defaultObject) {
		if (defaultObject[key] !== fullObject[key]) {
			partialObject[key] = fullObject[key];
		}
	}
	return partialObject;
}
