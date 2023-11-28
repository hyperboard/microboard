import {Descendant} from "slate";

/**
 * Not have descendants or have ONLY ONE paragraph with empty text
 * @param descendants
 */
export function isTextEmpty(descendants: Descendant[]): boolean {
	return descendants.length === 0 || descendants.length === 1 &&
		(descendants[0].type === "paragraph" &&
			descendants[0].children[0].text === "");
}
