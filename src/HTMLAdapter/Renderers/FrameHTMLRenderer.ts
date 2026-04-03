import { DocumentFactory } from "api/DocumentFactory";
import { resolveColor } from "Color";
import { conf } from "Settings";
import { renderLinkToHTML, translateElementBy } from "../Utils";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Frame } from "Items/Frame/Frame";
import { IItemHTMLRenderer, registerHTMLRenderer, renderItemToHTML } from "./HTMLItemRenderer";

export class FrameHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const frame = item as Frame;
    const div = documentFactory.createElement("frame-item");
    div.id = frame.getId();

    div.style.backgroundColor = resolveColor(frame.backgroundColor, conf.theme, 'background');
    div.style.opacity = frame.backgroundOpacity.toString();

    div.style.borderColor = resolveColor(frame.borderColor, conf.theme, 'foreground');
    div.style.borderWidth = `${frame.borderWidth}px`;
    div.style.borderStyle = frame.borderStyle;

    const { translateX, translateY } = frame.transformation.getMatrixData();

    const transform = `translate(${Math.round(translateX)}px, ${Math.round(
      translateY
    )}px) scale(1, 1)`;

    const width = frame.getMbr().getWidth();
    const height = frame.getMbr().getHeight();

    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";

    const textElement = renderItemToHTML(frame.text, documentFactory);
    textElement.style.transform = `translate(0px, -30px) scale(1, 1)`;
    textElement.id = `${frame.getId()}_text`;
    textElement.style.overflow = "visible";
    div.appendChild(textElement);

    div.setAttribute("data-link-to", frame.linkTo.serialize() || "");
    if (frame.getLinkTo()) {
      const linkElement = renderLinkToHTML(frame.linkTo, documentFactory);
      translateElementBy(
        linkElement,
        width - parseInt(linkElement.style.width),
        0
      );
      div.appendChild(linkElement);
    }

    return div;
  }
}

registerHTMLRenderer("Frame", new FrameHTMLRenderer());
