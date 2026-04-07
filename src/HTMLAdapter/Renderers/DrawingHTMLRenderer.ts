import { DocumentFactory } from "api/DocumentFactory";
import { resolveColor } from "Color";
import { conf } from "Settings";
import { isSafari } from "isSafari";
import { renderLinkToHTML, scaleElementBy, translateElementBy } from "../Utils";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Drawing } from "Items/Drawing/Drawing";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class DrawingHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const drawing = item as Drawing;
    const div = documentFactory.createElement("drawing-item");

    const { translateX, translateY, scaleX, scaleY } =
      drawing.transformation.getMatrixData();
    const mbr = drawing.getMbr();
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
    svg.setAttribute("style", "position: absolute; overflow: visible;");

    const pathElement = documentFactory.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    pathElement.setAttribute("d", this.getPathData(drawing));
    pathElement.setAttribute("stroke", resolveColor(drawing.borderColor, conf.theme, drawing.colorRole));
    pathElement.setAttribute("stroke-opacity", `${drawing.getStrokeOpacity()}`);
    pathElement.setAttribute("stroke-width", `${drawing.strokeWidth}`);
    pathElement.setAttribute("fill", "none");

    svg.appendChild(pathElement);
    div.appendChild(svg);

    div.id = drawing.getId();
    div.style.width = unscaledWidth + "px";
    div.style.height = unscaledHeight + "px";
    div.style.transformOrigin = "left top";
    div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.position = "absolute";

    div.setAttribute("data-link-to", drawing.linkTo.serialize() || "");
    if (drawing.getLinkTo()) {
      const linkElement = renderLinkToHTML(drawing.linkTo, documentFactory);
      scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
      translateElementBy(
        linkElement,
        (width - parseInt(linkElement.style.width)) / scaleX,
        0
      );
      div.appendChild(linkElement);
    }

    return div;
  }

  private getPathData(drawing: Drawing): string {
    const points = drawing.points;
    if (points.length < 2) {
      return "";
    }

    let pathData = `M ${points[0].x} ${points[0].y}`;

    if (points.length < 3) {
      pathData += ` L ${points[0].x + 0.5} ${points[0].y}`;
    } else {
      let j = 1;
      for (; j < points.length - 2; j++) {
        const cx = (points[j].x + points[j + 1].x) / 2;
        const cy = (points[j].y + points[j + 1].y) / 2;
        pathData += ` Q ${points[j].x} ${points[j].y} ${cx} ${cy}`;
      }

      const x =
        points[j].x === points[j + 1].x && isSafari()
          ? points[j + 1].x + 0.01
          : points[j + 1].x;
      const y =
        points[j].y === points[j + 1].y && isSafari()
          ? points[j + 1].y + 0.01
          : points[j + 1].y;

      pathData += ` Q ${points[j].x} ${points[j].y} ${x} ${y}`;
    }

    return pathData;
  }
}

registerHTMLRenderer("Drawing", new DrawingHTMLRenderer());
