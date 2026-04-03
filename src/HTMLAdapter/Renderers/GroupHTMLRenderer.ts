import { DocumentFactory } from "api/DocumentFactory";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Group } from "Items/Group/Group";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class GroupHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const group = item as Group;
    const div = documentFactory.createElement("div");
    div.id = group.id;
    const { translateX, translateY, scaleX, scaleY } =
      group.transformation.getMatrixData();

    div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.position = "absolute";
    div.style.transformOrigin = "0 0";

    return div;
  }
}

registerHTMLRenderer("Group", new GroupHTMLRenderer());
