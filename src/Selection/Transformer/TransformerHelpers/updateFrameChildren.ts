import { Frame } from "Items/Frame/Frame";
import { Mbr } from "Items/Mbr/Mbr";
import { Board } from "Board";
import { NestingHighlighter } from "Tools/NestingHighlighter/NestingHighlighter";

export function updateFrameChildren({
  mbr,
  board,
  nestingHighlighter,
}: {
  mbr: Mbr;
  board: Board;
  nestingHighlighter: NestingHighlighter;
}) {
  const groups = board.items.getGroupItemsEnclosedOrCrossed(
    mbr.left,
    mbr.top,
    mbr.right,
    mbr.bottom
  );
  board.selection.items.list().forEach((item) => {
    if ("getChildrenIds" in item && item.getChildrenIds()) {
      const currMbr = item.getMbr();
      const itemsToCheck = board.items.getEnclosedOrCrossed(
        currMbr.left,
        currMbr.top,
        currMbr.right,
        currMbr.bottom
      );
      itemsToCheck.forEach((currItem) => {
        if (
          item.handleNesting(currItem) &&
          (currItem.parent === "Board" || currItem.parent === item.getId())
        ) {
          nestingHighlighter.add(item, currItem);
        } else {
          nestingHighlighter.remove(currItem);
        }
      });
    } else {
      groups.forEach((group) => {
        if (group.handleNesting(item)) {
          nestingHighlighter.add(group, item);
        } else {
          nestingHighlighter.remove(item);
        }
      });
    }
  });
}
