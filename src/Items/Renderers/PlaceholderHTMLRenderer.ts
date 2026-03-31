import { DocumentFactory } from "api/DocumentFactory";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Placeholder } from "Items/Placeholder/Placeholder";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class PlaceholderHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const placeholder = item as Placeholder;
    return documentFactory.createElement("div");
  }
}

registerHTMLRenderer("Placeholder", new PlaceholderHTMLRenderer());
