import { Descendant } from "slate";

/**
 * Not have descendants or have ONLY ONE paragraph with empty text
 * @param descendants
 */
export function isTextEmpty(descendants: Descendant[]): boolean {
	for (const descendant of descendants) {
		if ("children" in descendant && !isTextEmpty(descendant.children)) {
			return false;
		}
		if ("text" in descendant && descendant.text !== "") {
			return false;
		}
	}

	return true;
}
