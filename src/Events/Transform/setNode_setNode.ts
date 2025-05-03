import { SetNodeOperation, Path } from "slate";

export function setNode_setNode(
	confirmed: SetNodeOperation,
	toTransform: SetNodeOperation,
): SetNodeOperation {
	console.log("setNode_setNode");
	const transformed = { ...toTransform };
	if (Path.equals(confirmed.path, toTransform.path)) {
		// todo think on it
		transformed.newProperties = {
			...toTransform.newProperties,
			...confirmed.newProperties,
		};
		transformed.properties = {
			...toTransform.properties,
			...confirmed.newProperties,
		};
	}
	return transformed;
}
