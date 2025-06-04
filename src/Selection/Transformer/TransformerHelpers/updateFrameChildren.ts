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
  const frames = board.items.getFramesEnclosedOrCrossed(
    mbr.left,
    mbr.top,
    mbr.right,
    mbr.bottom
  );
  board.selection.items.list().forEach((item) => {
    if (item instanceof Frame) {
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
      frames.forEach((frame) => {
        if (frame.handleNesting(item)) {
          nestingHighlighter.add(frame, item);
        } else {
          nestingHighlighter.remove(item);
        }
      });
    }
  });
}
