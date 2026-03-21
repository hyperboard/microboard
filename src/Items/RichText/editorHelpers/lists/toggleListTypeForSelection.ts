import { BlockNode, BulletedListNode, ListItemNode, ListType, NumberedListNode } from 'Items/RichText/Editor/BlockNode';
import { Editor, Element, NodeEntry, Path, Text, Transforms } from 'slate';
import { CustomEditor } from 'Items/RichText/Editor/Editor.d';
import { getBlockParentList } from 'Items/RichText/editorHelpers/lists/getBlockParentList';

export function toggleListTypeForSelection(editor: CustomEditor, targetListType: ListType) {
	const { selection } = editor;

	if (!selection) {
		return false;
	}

	Editor.withoutNormalizing(editor, () => {
		const nodes = Array.from(
			Editor.nodes(editor, {
				at: selection,
				mode: 'lowest',
				match: n => Element.isElement(n) && !Editor.isEditor(n) && Editor.isBlock(editor, n),
			})
		);

		const nodesWithLists: Record<number, [node: BlockNode, path: number[]][]> = {};

		const unwrapCandidates: BlockNode[] = [];

		nodes.forEach(([n, path]) => {
			const parentList = getBlockParentList(editor, path);
			const node = n as BlockNode;
			if (parentList) {
				unwrapCandidates.push(node);
				if (!nodesWithLists[parentList[1].length]) {
					nodesWithLists[parentList[1].length] = [parentList];
				} else if (
					!nodesWithLists[parentList[1].length].some(
						nodeEntry => nodeEntry[0] === parentList[0]
					)
				) {
					nodesWithLists[parentList[1].length].push(parentList);
				}
			} else {
				if (nodesWithLists[path.length]) {
					nodesWithLists[path.length].push([node, path]);
				} else {
					nodesWithLists[path.length] = [[node, path]];
				}
			}
		});

		const entries = Object.entries(nodesWithLists);
		if (entries.length === 0) {
			return false;
		}
		const [level, nodesArr] = entries[0];

		const newSelectionStart: Path = nodesArr[0][1];
		const newSelectionEnd: Path = [...nodesArr[nodesArr.length - 1][1]];
		let diff = 0;

		for (const [node, path] of nodesArr) {
			if (Element.isElement(node)) {
				if (node.type === 'ol_list' || node.type === 'ul_list') {
					const childrenCount = node.children.length;
					newSelectionEnd[newSelectionEnd.length - 1] =
						newSelectionEnd[newSelectionEnd.length - 1] + childrenCount - 1;
					path[path.length - 1] = path[path.length - 1] + diff;
					Transforms.unwrapNodes(editor, {
						at: path,
						mode: 'highest',
						match: n => Element.isElement(n) && n.type === 'list_item',
						split: true,
					});

					Transforms.unwrapNodes(editor, {
						at: path,
						mode: 'highest',
						match: n =>
							Element.isElement(n) && (n.type === 'ol_list' || n.type === 'ul_list'),
						split: true,
					});
					diff = diff + childrenCount - 1;
				} else if (node.type === 'list_item') {
					Transforms.unwrapNodes(editor, {
						at: path,
						match: n => Element.isElement(n) && n.type === 'list_item',
						split: true,
					});
				}
			}
		}

		const refreshedNodes = Array.from(
			Editor.nodes(editor, {
				at: Editor.range(editor, newSelectionStart, newSelectionEnd),
				mode: 'all',
				match: n => Element.isElement(n),
			})
		).filter(([_, path]) => path.length === Number(level)) as NodeEntry<BlockNode>[];

		const beforeSplitNodes: NodeEntry<BlockNode>[] = [];
		const afterSplitNodes: NodeEntry<BlockNode>[] = [];
		let splitFound = false;
		const firstLevelNodes = nodesWithLists[Object.keys(nodesWithLists)[0] as unknown as number];
		const shouldUnwrapNodes =
			firstLevelNodes.length === 1 && (firstLevelNodes[0][0].type === 'ol_list' || firstLevelNodes[0][0].type === 'ul_list') && targetListType === firstLevelNodes[0][0].type;

		refreshedNodes.forEach(([node, path]) => {
			if (shouldUnwrapNodes && unwrapCandidates.includes(node)) {
				if (!splitFound) {
					splitFound = true;
				}
			} else if (!splitFound) {
				beforeSplitNodes.push([node, path]);
			} else {
				afterSplitNodes.push([node, path]);
			}
		});

		if (afterSplitNodes.length) {
			wrapNodesCustom(editor, afterSplitNodes, targetListType);
		}

		if (beforeSplitNodes.length) {
			wrapNodesCustom(editor, beforeSplitNodes, targetListType);
		}
	});
	return true;
}

function wrapNodesCustom(
	editor: Editor,
	nodes: NodeEntry<BlockNode>[],
	targetListType: ListType
) {
	const listRange = Editor.range(editor, nodes[0][1], nodes[nodes.length - 1][1]);

	Transforms.wrapNodes(
		editor,
		{ type: targetListType, listLevel: 1, children: [] },
		{ at: listRange }
	);

	const [list] = Editor.node(
		editor,
		listRange.anchor.path.slice(0, listRange.anchor.path.length - 1)
	);
	const listPath = Path.parent(listRange.anchor.path);

	if (Element.isElement(list) && (list.type === 'ol_list' || list.type === 'ul_list')) {
		for (let i = 0; i < list.children.length; i++) {
			const childPath = [...listPath, i];
			Transforms.wrapNodes(editor, { type: 'list_item', children: [] }, { at: childPath });
		}
	}
}
