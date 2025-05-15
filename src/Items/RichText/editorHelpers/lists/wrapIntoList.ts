import { ListType } from "Board/Items/RichText/Editor/BlockNode";
import { Location, Transforms } from "slate";
import { CustomEditor } from "Board/Items/RichText/Editor/Editor.d";

export function wrapIntoList(
	editor: CustomEditor,
	targetListType: ListType,
	location: Location,
) {
	Transforms.wrapNodes(
		editor,
		{ type: targetListType, listLevel: 1, children: [] },
		{ at: location },
	);
	Transforms.wrapNodes(
		editor,
		{ type: "list_item", children: [] },
		{ at: location },
	);
}
