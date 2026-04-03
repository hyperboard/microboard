import { DocumentFactory } from "api/DocumentFactory";
import { resolveColor } from "Color";
import { conf } from "Settings";
import { positionRelatively, renderLinkToHTML, resetElementScale, scaleElementBy, translateElementBy } from "../Utils";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Sticker } from "Items/Sticker/Sticker";
import { IItemHTMLRenderer, registerHTMLRenderer, renderItemToHTML } from "./HTMLItemRenderer";

export class StickerHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const sticker = item as Sticker;
    const div = documentFactory.createElement("sticker-item");

    const { translateX, translateY, scaleX, scaleY } =
      sticker.transformation.getMatrixData();
    const transform = `translate(${Math.round(translateX)}px, ${Math.round(
      translateY
    )}px) scale(${scaleX}, ${scaleY})`;
    const itemMbr = sticker.getMbr();
    const height = itemMbr.getHeight();
    const unscaledWidth = itemMbr.getWidth() / scaleX;
    const unscaledHeight = height / scaleY;

    div.id = sticker.getId();
    div.style.backgroundColor = resolveColor(sticker.backgroundColor, conf.theme, 'background');
    div.style.width = `${unscaledWidth}px`;
    div.style.height = `${unscaledHeight}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.boxShadow =
      "0px 18px 24px rgba(20, 21, 26, 0.25), 0px 8px 8px rgba(20, 21, 26, 0.125)";

    const autoScale =
      (sticker.text.isAutosize() && sticker.text.getAutoSizeScale()) || 1;
    const textElement = renderItemToHTML(sticker.text, documentFactory);
    const padding = 8;
    textElement.id = `${sticker.getId()}_text`;
    textElement.style.overflow = "auto";
    positionRelatively(textElement, div, padding);
    resetElementScale(textElement);
    scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
    scaleElementBy(textElement, autoScale, autoScale);
    
    const maxAvailableWidth = (unscaledWidth - 2 * padding);
    textElement.style.maxWidth = `${maxAvailableWidth * scaleX}px`;
    
    if (autoScale < 1) {
      textElement.style.width = `${maxAvailableWidth * scaleX}px`;
    } else {
      textElement.style.width = "100%";
    }
    const textHeight = sticker.text.layoutNodes.height * autoScale;
    if (textHeight < height) {
      const alignment = sticker.text.getVerticalAlignment();
      if (alignment === "center") {
        textElement.style.marginTop = `${(height - textHeight) / 2 / scaleY}px`;
      } else if (alignment === "bottom") {
        textElement.style.marginTop = `${(height - textHeight) / scaleY}px`;
      } else {
        textElement.style.marginTop = "0px";
      }
    }

    div.setAttribute("data-link-to", sticker.linkTo.serialize() || "");
    if (sticker.getLinkTo()) {
      const linkElement = renderLinkToHTML(sticker.linkTo, documentFactory);
      scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
      translateElementBy(
        linkElement,
        unscaledWidth - parseInt(linkElement.style.width) / scaleX,
        0
      );
      div.appendChild(linkElement);
    }

    div.appendChild(textElement);

    return div;
  }
}

registerHTMLRenderer("Sticker", new StickerHTMLRenderer());
