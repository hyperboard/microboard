import { DocumentFactory } from "api/DocumentFactory";
import { resolveColor } from "Color";
import { conf } from "Settings";
import { positionRelatively, renderPathToHTML, resetElementScale, scaleElementBy } from "../Utils";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { Connector } from "Items/Connector/Connector";
import { ControlPoint } from "Items/Connector/ControlPoint";
import { Path, Paths } from "Geometry/Path";
import { IItemHTMLRenderer, registerHTMLRenderer, renderItemToHTML } from "./HTMLItemRenderer";

export class ConnectorHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const connector = item as Connector;
    const div = documentFactory.createElement('connector-item');

    const { translateX, translateY, scaleX, scaleY } = connector.transformation.getMatrixData();
    const mbr = connector.getMbr();
    const width = mbr.getWidth();
    const height = mbr.getHeight();
    const unscaledWidth = width / scaleX;
    const unscaledHeight = height / scaleY;

    const svg = documentFactory.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', `${unscaledWidth}px`);
    svg.setAttribute('height', `${unscaledHeight}px`);
    svg.setAttribute('viewBox', `0 0 ${unscaledWidth} ${unscaledHeight}`);
    svg.setAttribute('style', 'position: absolute; overflow: visible;');

    const renderPathHTML = (path: Path | Paths): SVGPathElement[] => {
      const pathElement = renderPathToHTML(path, documentFactory);
      const paths = Array.isArray(pathElement) ? pathElement : [pathElement];

      paths.forEach(element => {
        element.setAttribute(
          'transform',
          `translate(${-translateX}, ${-translateY}) scale(${1 / scaleX}, ${1 / scaleY})`
        );
      });

      return paths;
    };

    const lines = renderPathHTML(connector.lines);
    svg.append(...lines);

    if (connector.getStartPointerStyle() !== 'None') {
      const startPointer = renderPathHTML(connector.startPointer.path);
      if (
        !(
          connector.startPointer.name.toLowerCase().includes('filled') ||
          connector.startPointer.name.toLowerCase().includes('arrow')
        )
      ) {
        startPointer.forEach(el => el.setAttribute('fill', 'none'));
      }
      svg.append(...startPointer);
    }
    if (connector.getEndPointerStyle() !== 'None') {
      const endPointer = renderPathHTML(connector.endPointer.path);
      if (
        !(
          connector.endPointer.name.toLowerCase().includes('filled') ||
          connector.endPointer.name.toLowerCase().includes('arrow')
        )
      ) {
        endPointer.forEach(el => el.setAttribute('fill', 'none'));
      }
      svg.append(...endPointer);
    }

    div.appendChild(svg);

    div.id = connector.getId();
    div.style.width = unscaledWidth + 'px';
    div.style.height = unscaledHeight + 'px';
    div.style.transformOrigin = 'left top';
    div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    div.style.position = 'absolute';
    div.setAttribute('data-line-color', resolveColor((connector as any).lineColor, conf.theme, 'foreground'));
    div.setAttribute('data-line-width', (connector as any).lineWidth.toString());
    div.setAttribute('data-line-style', (connector as any).lineStyle);
    div.setAttribute('data-border-style', connector.borderStyle);

    const setPointAttributes = (
      div: HTMLElement,
      point: ControlPoint,
      variant: 'start' | 'end'
    ): void => {
      const prefix = `data-${variant}-point`;
      div.setAttribute(
        `${prefix}er-style`,
        variant === 'start' ? connector.getStartPointerStyle() : connector.getEndPointerStyle()
      );
      div.setAttribute(`${prefix}-type`, point.pointType);
      div.setAttribute(
        `${prefix}-item`,
        (point.pointType !== 'Board' && point.item.getId()) || ''
      );
      div.setAttribute(
        `${prefix}-relative-x`,
        ('relativePoint' in point && (point as any).relativePoint.x.toString()) || ''
      );
      div.setAttribute(
        `${prefix}-relative-y`,
        ('relativePoint' in point && (point as any).relativePoint.y.toString()) || ''
      );
      div.setAttribute(`${prefix}-x`, point.x.toString());
      div.setAttribute(`${prefix}-y`, point.y.toString());

      if (point.pointType === 'FixedConnector') {
        div.setAttribute(`${prefix}-tangent`, (point as any).tangent.toString());
        div.setAttribute(`${prefix}-segment`, (point as any).segmentIndex.toString());
      }
    };

    setPointAttributes(div, (connector as any).startPoint, 'start');
    setPointAttributes(div, (connector as any).endPoint, 'end');

    const textElement = renderItemToHTML(connector.text, documentFactory);
    textElement.id = `${connector.getId()}_text`;
    textElement.style.overflow = 'auto';
    positionRelatively(textElement, div);
    resetElementScale(textElement);
    scaleElementBy(textElement, 1 / scaleX, 1 / scaleY);
    div.appendChild(textElement);
    div.setAttribute('data-link-to', connector.linkTo.serialize() || '');

    return div;
  }
}

registerHTMLRenderer("Connector", new ConnectorHTMLRenderer());
