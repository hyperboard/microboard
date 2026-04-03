import { DocumentFactory } from "api/DocumentFactory";
import { Matrix } from "Geometry/Transformation/Matrix";
import { positionRelatively, renderLinkToHTML, renderPathToHTML, resetElementScale, scaleElementBy, translateElementBy } from "../Utils";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { AINode } from "Items/AINode/AINode";
import { createNodePath } from "Items/AINode/AINodeData";
import { LinePatterns } from "Geometry/Path/Path";
import { IItemHTMLRenderer, registerHTMLRenderer, renderItemToHTML } from "./HTMLItemRenderer";

const BUTTON_SIZE = 20;
const ICON_SRC =
  "data:image/svg+xml;charset=utf-8,%3Csvg id='AIChatSendArrow' viewBox='0 0 21 21' xmlns='http://www.w3.org/2000/svg' fill='url(%23paint0_linear_7542_32550)'%3E%3Cpath d='M0.946815 7.31455C0.424815 7.14055 0.419815 6.85955 0.956815 6.68055L20.0438 0.318552C20.5728 0.142552 20.8758 0.438552 20.7278 0.956552L15.2738 20.0426C15.1238 20.5716 14.8188 20.5896 14.5948 20.0876L11.0008 11.9996L17.0008 3.99955L9.00081 9.99955L0.946815 7.31455Z'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear_7542_32550' x1='10.66' y1='0.267578' x2='10.66' y2='20.452' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23CD4FF2'/%3E%3Cstop offset='1' stop-color='%235F4AFF'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";

export class AINodeHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const aiNode = item as AINode;
    const div = documentFactory.createElement("ainode-item");

    const { translateX, translateY, scaleX, scaleY } =
      aiNode.transformation.getMatrixData();
    const mbr = aiNode.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    const unscaledWidth = width;
    const unscaledHeight = height;
    const transform = `translate(${Math.round(translateX)}px, ${Math.round(
      translateY
    )}px)`;

    const svg = documentFactory.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("width", `${unscaledWidth}px`);
    svg.setAttribute("height", `${unscaledHeight}px`);
    svg.setAttribute("viewBox", `0 0 ${unscaledWidth} ${unscaledHeight}`);
    svg.setAttribute("transform-origin", "0 0");
    svg.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);
    svg.setAttribute("style", "position: absolute; overflow: visible;");

    const pathElement = renderPathToHTML(createNodePath(
      aiNode.getMbr(),
      new Matrix(0, 0, scaleX, scaleY)
    )
      .copy(), documentFactory);
    const paths = Array.isArray(pathElement) ? pathElement : [pathElement];
    paths.forEach((element) => {
      element.setAttribute("fill", "rgb(255, 255, 255) ");
      element.setAttribute("stroke", "rgba(222, 224, 227, 1)");
      element.setAttribute(
        "stroke-dasharray",
        LinePatterns["solid"].join(", ")
      );
      element.setAttribute("stroke-width", "1");
      element.setAttribute("transform-origin", "0 0");
      element.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);
    });
    svg.append(...paths);
    div.appendChild(svg);

    div.id = aiNode.getId();
    div.style.width = `${unscaledWidth}px`;
    div.style.height = `${unscaledHeight}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    if (aiNode.getParentId()) {
      div.setAttribute("parent-node-id", aiNode.getParentId()!);
    }
    if (aiNode.getIsUserRequest()) {
      div.setAttribute("is-user-request", "true");
    }
    const contextItems = aiNode.getContextItems();
    if (contextItems.length) {
      div.setAttribute("context-items", contextItems.join(","));
    }
    div.setAttribute("context-range", aiNode.getContextRange().toString());

    const button = documentFactory.createElement("button");
    button.style.position = "absolute";
    button.style.cursor = "pointer";
    const img = documentFactory.createElement("img");
    img.setAttribute("src", ICON_SRC);
    img.setAttribute("alt", "#");
    img.setAttribute("width", `${BUTTON_SIZE}px`);
    img.setAttribute("height", `${BUTTON_SIZE}px`);
    button.style.background = "none";
    button.style.border = "none";
    button.style.outline = "none";
    button.style.cursor = "pointer";
    button.setAttribute("width", `${BUTTON_SIZE}px`);
    button.setAttribute("height", `${BUTTON_SIZE}px`);
    button.appendChild(img);
    translateElementBy(
      button,
      width - BUTTON_SIZE * scaleX * 2,
      height - BUTTON_SIZE * scaleY * 2
    );
    scaleElementBy(button, scaleX, scaleY);
    div.appendChild(button);

    const textElement = renderItemToHTML(aiNode.text, documentFactory);
    textElement.id = `${aiNode.getId()}_text`;
    const maxWidth = aiNode.text.getMaxWidth();
    if (maxWidth) {
      textElement.style.width = `${maxWidth}px`;
    } else {
      textElement.style.width = "600px";
    }
    textElement.style.removeProperty("height");
    textElement.style.overflow = "auto";
    positionRelatively(textElement, div);
    translateElementBy(textElement, 20 * scaleX, 20 * scaleY);

    div.setAttribute("data-link-to", aiNode.linkTo.serialize() || "");
    if (aiNode.getLinkTo()) {
      const linkElement = renderLinkToHTML(aiNode.linkTo, documentFactory);
      resetElementScale(linkElement);
      translateElementBy(
        linkElement,
        width - parseInt(linkElement.style.width),
        0
      );
      div.appendChild(linkElement);
    }

    div.appendChild(textElement);

    return div;
  }
}

registerHTMLRenderer("AINode", new AINodeHTMLRenderer());
