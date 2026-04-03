import { DocumentFactory } from "api/DocumentFactory";
import { conf } from "Settings";
import { BaseItem } from "Items/BaseItem/BaseItem";
import { AudioItem } from "Items/Audio/Audio";
import { renderLinkToHTML } from "../Utils";
import { IItemHTMLRenderer, registerHTMLRenderer } from "./HTMLItemRenderer";

export class AudioHTMLRenderer implements IItemHTMLRenderer {
  render(item: BaseItem, documentFactory: DocumentFactory): HTMLElement {
    const audioItem = item as AudioItem;
    const div = documentFactory.createElement("audio-item");
    const { translateX, translateY, scaleX, scaleY } =
      audioItem.transformation.getMatrixData();
    const transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

    div.id = audioItem.getId();
    div.style.width = `${conf.AUDIO_DIMENSIONS.width}px`;
    div.style.height = `${conf.AUDIO_DIMENSIONS.height}px`;
    div.style.transformOrigin = "top left";
    div.style.transform = transform;
    div.style.position = "absolute";
    div.setAttribute("audio-url", audioItem.getUrl());
    if ((audioItem as any).extension) {
      div.setAttribute("extension", (audioItem as any).extension);
    }
    div.setAttribute("data-link-to", audioItem.linkTo.serialize() || "");
    if (audioItem.getLinkTo()) {
      const linkElement = renderLinkToHTML(audioItem.linkTo, documentFactory);
      div.appendChild(linkElement);
    }

    return div;
  }
}

registerHTMLRenderer("Audio", new AudioHTMLRenderer());
