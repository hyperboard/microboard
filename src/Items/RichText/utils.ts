export function findCommonStrings(arrays: string[][]): string[] {
	if (arrays.length === 0) {
		return [];
	}

	let commonStrings = arrays[0];

	for (let i = 1; i < arrays.length; i++) {
		commonStrings = commonStrings.filter(str => arrays[i].includes(str));
	}

	return commonStrings;
}
