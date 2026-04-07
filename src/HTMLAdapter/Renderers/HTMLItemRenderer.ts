import { DocumentFactory } from "api/DocumentFactory";
import { BaseItem } from "Items/BaseItem/BaseItem";

export interface IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement;
}

const renderers: Record<string, IItemHTMLRenderer> = {};

export function registerHTMLRenderer(itemType: string, renderer: IItemHTMLRenderer): void {
  renderers[itemType] = renderer;
}

export function renderItemToHTML(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
  const renderer = renderers[item.itemType] || defaultRenderer;
  return renderer.render(item, documentFactory);
}

const defaultRenderer: IItemHTMLRenderer = {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const div = documentFactory.createElement("base-item");
    const { translateX, translateY, scaleX, scaleY } = item.transformation.getMatrixData();
    const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

    div.style.backgroundColor = "#b2b0c3";
    div.id = item.getId();
    div.style.width = `${item.getWidth()}px`;
    div.style.height = `${item.getHeight()}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";

    div.setAttribute("serialized-data", JSON.stringify(item.serialize()));
    return div;
  }
};
