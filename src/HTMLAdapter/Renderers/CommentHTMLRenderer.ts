import { DocumentFactory } from "api/DocumentFactory";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Comment } from "Items/Comment/Comment";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class CommentHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const comment = item as Comment;
    const div = documentFactory.createElement("comment-item");
    const { translateX, translateY, scaleX, scaleY } =
      comment.transformation.getMatrixData();
    const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.setAttribute("comment-data", JSON.stringify(comment.serialize()));
    return div;
  }
}

registerHTMLRenderer("Comment", new CommentHTMLRenderer());
