import { Board } from "Board";
import { BoardTool } from "Tools/BoardTool";
import { Comment, Point } from "../../Items";

export class AddComment extends BoardTool {
  isDown = false;
  comment: null | Comment = null;
  constructor(board: Board) {
    super(board);
    this.setCursor();
  }

  setCursor(): void {
    this.board.pointer.setCursor("comment");
  }

  leftButtonDown(): boolean {
    this.isDown = true;
    this.board.tools.publish();
    return true;
  }

  pointerMoveBy(_x: number, _y: number): boolean {
    if (!this.isDown) {
      return true;
    }
    return false;
  }

  leftButtonUp(): boolean {
    this.isDown = false;
    this.board.selection.removeAll();
    const comment = new Comment(this.board);
    comment.deserialize({
      itemType: "Comment",
      anchor: this.board.pointer.point.copy(),
    } as any);
    this.comment = this.board.add(comment);
    this.board.tools.publish();
    return true;
  }

  keyDown(key: string): boolean {
    if (key === "Escape") {
      this.board.tools.select(true);
      return true;
    }
    return false;
  }

  returnToTool = (): void => {
    this.board.tools.setTool(this);
    this.setCursor();
  };

  onCancel() {
    this.comment = null;
  }
}
