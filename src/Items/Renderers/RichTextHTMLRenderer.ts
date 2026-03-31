import { DocumentFactory } from "api/DocumentFactory";
import { resolveColor } from "Color";
import { conf } from "Settings";
import { renderLinkToHTML, scaleElementBy, translateElementBy } from "HTMLRender";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { RichText } from "Items/RichText/RichText";
import { Matrix } from "Items/Transformation/Matrix";
import { Descendant, Element } from "slate";
import { TextNode } from "Items/RichText/Editor/TextNode";
import { decodeHtml } from "parserHTML";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class RichTextHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const richText = item as RichText;

    const escapeHtml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const renderNode = (node: Descendant): HTMLElement => {
      if (node.type === "text" || "text" in node) {
        const textNode = node as any as TextNode;
        const text =
          textNode.text.trim() !== ""
            ? decodeHtml(escapeHtml(textNode.text))
            : "\u00A0";

        const textElement = textNode.link
          ? Object.assign(documentFactory.createElement("a"), {
              href: textNode.link,
              target: "_blank",
              rel: "noreferrer",
            })
          : documentFactory.createElement("span");

        Object.assign(textElement.style, {
          fontWeight: textNode.bold ? "700" : "400",
          fontStyle: textNode.italic ? "italic" : "",
          textDecoration: [
            textNode.underline ? "underline" : "",
            textNode["line-through"] ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" "),
          color: textNode.fontColor
            ? resolveColor(textNode.fontColor, conf.theme, 'foreground')
            : conf.DEFAULT_TEXT_STYLES.fontColor,
          backgroundColor: textNode.fontHighlight
            ? resolveColor(textNode.fontHighlight, conf.theme, 'background')
            : conf.DEFAULT_TEXT_STYLES.fontHighlight,
          fontSize: textNode.fontSize
            ? `${textNode.fontSize}px`
            : `${conf.DEFAULT_TEXT_STYLES.fontSize}px`,
          fontFamily: textNode.fontFamily || conf.DEFAULT_TEXT_STYLES.fontFamily,
        });

        if (richText.insideOf === "Frame") {
          Object.assign(textElement.style, {
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "inline-block",
            width: "100%",
          });
        }

        textElement.textContent = text;
        return textElement;
      }

      if (Element.isElement(node)) {
        const children = node.children.map(renderNode);
        const applyCommonStyles = (el: HTMLElement) => {
          el.style.textAlign = (node as any).horisontalAlignment || "left";
          el.style.paddingTop = (node as any).paddingTop ? `${(node as any).paddingTop}px` : "";
          el.style.paddingBottom = (node as any).paddingBottom
            ? `${(node as any).paddingBottom}px`
            : "";
        };

        switch ((node as any).type) {
          case "heading_one":
          case "heading_two":
          case "heading_three":
          case "heading_four":
          case "heading_five": {
            const level = (node as any).type.split("_")[1];
            const levels = {
              one: 1,
              two: 2,
              three: 3,
              four: 4,
              five: 5,
            } as const;
            const header = documentFactory.createElement(
              `h${levels[level as keyof typeof levels]}`
            );
            applyCommonStyles(header);
            header.append(...children);
            return header;
          }

          case "code_block": {
            const pre = documentFactory.createElement("pre");
            const code = documentFactory.createElement("code");
            applyCommonStyles(pre);
            if ((node as any).language) {
              code.classList.add(`language-${(node as any).language}`);
            }
            code.append(...children);
            pre.append(code);
            Object.assign(pre.style, {
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            });
            return pre;
          }

          case "block-quote": {
            const blockquote = documentFactory.createElement("blockquote");
            applyCommonStyles(blockquote);
            blockquote.append(...children);
            return blockquote;
          }

          case "ul_list": {
            const ul = documentFactory.createElement("ul");
            applyCommonStyles(ul);
            ul.append(...children);
            return ul;
          }

          case "ol_list": {
            const ol = documentFactory.createElement("ol");
            applyCommonStyles(ol);
            ol.append(...children);
            return ol;
          }

          case "list_item": {
            const li = documentFactory.createElement("li");
            applyCommonStyles(li);
            li.append(...children);
            return li;
          }

          case "paragraph":
          default: {
            const par = documentFactory.createElement("p");
            applyCommonStyles(par);
            Object.assign(par.style, {
              lineHeight: (node as any).lineHeight
                ? `${(node as any).lineHeight}`
                : conf.DEFAULT_TEXT_STYLES.lineHeight,
              margin: "0",
            });
            par.append(...children);
            return par;
          }
        }
      }

      return documentFactory.createElement("div");
    };

    const elements = richText.editor.editor.children.map(renderNode);

    const cameraScale = richText.board.camera.getScale();
    const extraScale = richText.renderingScale ? richText.renderingScale(cameraScale) : 1;

    let matrix: Matrix;
    if (richText.customTransformationMatrix) {
      matrix = richText.customTransformationMatrix();
    } else {
      matrix = richText.transformation.toMatrix();
    }
    const { scaleX, scaleY } = matrix;

    const transform = `translate(${richText.left}px, ${richText.top}px) scale(${scaleX * extraScale}, ${scaleY * extraScale})`;

    const transformedWidth = richText.getMbr().getWidth();
    const transformedHeight = richText.getMbr().getHeight();

    const div = documentFactory.createElement("rich-text");
    div.id = richText.getId();
    div.style.width = `${transformedWidth + 5}px`;
    div.style.height = `${transformedHeight}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.style.overflow = "hidden";
    div.style.overflowWrap = "break-word";
    div.style.maxWidth = richText.getMaxWidth() ? `${richText.getMaxWidth()}px` : "";

    if (richText.layoutNodes.height < transformedHeight) {
      const alignment = richText.getVerticalAlignment();
      if (alignment === "center") {
        div.style.marginTop = `${
          (transformedHeight - richText.layoutNodes.height) / 2 / scaleY
        }px`;
      } else if (alignment === "bottom") {
        div.style.marginTop = `${
          (transformedHeight - richText.layoutNodes.height) / scaleY
        }px`;
      }
    }

    div.setAttribute("data-vertical-alignment", richText.getVerticalAlignment());
    div.setAttribute(
      "data-horizontal-alignment",
      richText.getHorisontalAlignment() || "left"
    );
    div.setAttribute("data-placeholder-text", richText.placeholderText);
    div.setAttribute(
      "data-real-size",
      richText.isAutosize() ? "auto" : richText.getFontSize().toString()
    );
    div.setAttribute("data-link-to", richText.linkTo.serialize() || "");

    if (richText.getLinkTo() && (richText.insideOf === "RichText" || !richText.insideOf)) {
      const linkElement = renderLinkToHTML(richText.linkTo, documentFactory);
      scaleElementBy(linkElement, 1 / scaleX, 1 / scaleY);
      translateElementBy(
        linkElement,
        (richText.getMbr().getWidth() - parseInt(linkElement.style.width)) / scaleX,
        0
      );
      div.appendChild(linkElement);
    }

    div.append(...elements);

    return div;
  }
}

registerHTMLRenderer("RichText", new RichTextHTMLRenderer());
