import { DocumentFactory } from "api/DocumentFactory";
import { resolveColor } from "Color";
import { conf } from "Settings";
import { LinePatterns } from "Items/Path";
import { positionRelatively, renderLinkToHTML, renderPathToHTML, resetElementScale, scaleElementBy, translateElementBy } from "HTMLRender";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Shape } from "Items/Shape/Shape";
import { Shapes } from "Items/Shape/Shapes";
import { IItemHTMLRenderer, registerHTMLRenderer, renderItemToHTML } from "./HTMLItemRenderer";

export class ShapeHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const shape = item as Shape;
    const div = documentFactory.createElement("shape-item");

    const { translateX, translateY, scaleX, scaleY } = shape.transformation.getMatrixData();
    const mbr = shape.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    const unscaledWidth = width / scaleX;
    const unscaledHeight = height / scaleY;

    const svg = documentFactory.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    svg.setAttribute("width", `${unscaledWidth}px`);
    svg.setAttribute("height", `${unscaledHeight}px`);
    svg.setAttribute("viewBox", `0 0 ${unscaledWidth} ${unscaledHeight}`);
    svg.setAttribute("transform-origin", "0 0");
    svg.setAttribute("transform", `scale(${1 / scaleX}, ${1 / scaleY})`);
    svg.setAttribute("style", "position: absolute; overflow: visible;");

    const pathElement = renderPathToHTML(Shapes[shape.shapeType].path
      .copy(), documentFactory);
    const paths = Array.isArray(pathElement) ? pathElement : [pathElement];
    paths.forEach((element) => {
      element.setAttribute("fill", resolveColor(shape.backgroundColor, conf.theme, "background"));
      element.setAttribute("stroke", resolveColor(shape.borderColor, conf.theme, "foreground"));
      element.setAttribute(
        "stroke-dasharray",
        LinePatterns[shape.borderStyle].join(", ")
      );
      element.setAttribute("stroke-width", shape.borderWidth.toString());
      element.setAttribute("transform-origin", "0 0");
      element.setAttribute("transform", `scale(${scaleX}, ${scaleY})`);
    });
    svg.append(...paths);
    div.appendChild(svg);

    div.id = shape.getId();
    div.style.width = unscaledWidth + "px";
    div.style.height = unscaledHeight + "px";
    div.style.transformOrigin = "left top";
    div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.position = "absolute";
    div.setAttribute("data-shape-type", shape.shapeType);
    div.setAttribute("fill", resolveColor(shape.backgroundColor, conf.theme, "background"));
    div.setAttribute("stroke", resolveColor(shape.borderColor, conf.theme, "foreground"));
    div.setAttribute("data-border-style", shape.borderStyle);
    div.setAttribute(
      "stroke-dasharray",
      LinePatterns[shape.borderStyle].join(", ")
    );
    div.setAttribute("stroke-width", shape.borderWidth.toString());

    const textElement = renderItemToHTML(shape.text, documentFactory);
    textElement.id = `${shape.getId()}_text`;
    textElement.style.overflow = "auto";
    positionRelatively(textElement, div);
    resetElementScale(textElement);
    scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);

    div.setAttribute("data-link-to", shape.linkTo.serialize() || "");
    if (shape.getLinkTo()) {
      const linkElement = renderLinkToHTML(shape.linkTo, documentFactory);
      scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
      translateElementBy(
        linkElement,
        (width - parseInt(linkElement.style.width)) / scaleX,
        0
      );
      div.appendChild(linkElement);
    }

    div.appendChild(textElement);

    return div;
  }
}

registerHTMLRenderer("Shape", new ShapeHTMLRenderer());
