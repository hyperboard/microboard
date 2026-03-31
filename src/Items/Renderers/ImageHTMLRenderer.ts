import { DocumentFactory } from "api/DocumentFactory";
import { renderLinkToHTML, scaleElementBy, translateElementBy } from "HTMLRender";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { ImageItem } from "Items/Image/Image";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class ImageHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const imageItem = item as ImageItem;
    const div = documentFactory.createElement("image-item");
    const { translateX, translateY, scaleX, scaleY } =
      imageItem.transformation.getMatrixData();
    const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;


    div.style.backgroundImage = `url(${(imageItem as any).storageLink})`;

    div.id = imageItem.getId();
    div.style.width = `${imageItem.imageDimension.width}px`;
    div.style.height = `${imageItem.imageDimension.height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.backgroundSize = "cover";
    div.setAttribute("rotation", imageItem.transformation.getRotation().toString());

    div.setAttribute("data-link-to", imageItem.linkTo.serialize() || "");
    if (imageItem.getLinkTo()) {
      const linkElement = renderLinkToHTML(imageItem.linkTo, documentFactory);
      scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
      translateElementBy(
        linkElement,
        (imageItem.getMbr().getWidth() - parseInt(linkElement.style.width)) / scaleX,
        0
      );
      div.appendChild(linkElement);
    }

    return div;
  }
}

registerHTMLRenderer("Image", new ImageHTMLRenderer());
