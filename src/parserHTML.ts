import { positionAbsolutely } from "HTMLRender";
import {
  ItemType,
  ItemData,
  Matrix,
  RichTextData,
  FrameData,
  ShapeData,
  ConnectorData, BlockNode, TextNode,
} from "Items";
import { AINodeData } from "Items/AINode";
import { HorisontalAlignment, VerticalAlignment } from "Items/Alignment";
import { AudioItemData } from "Items/Audio";
import { CommentData } from "Items/Comment";
import { ConnectorLineStyle } from "Items/Connector";
import { ConnectionLineWidth } from "Items/Connector/Connector";
import { ControlPointData } from "Items/Connector/ControlPoint";
import { ConnectorPointerStyle } from "Items/Connector/Pointers/Pointers";
import { DrawingData } from "Items/Drawing";
import { Frames } from "Items/Frame/Basic";
import { ImageItemData } from "Items/Image";
import { BorderStyle } from "Items/Path";
import { DefaultRichTextData } from "Items/RichText/RichTextData";
import { ShapeType } from "Items/Shape";
import { StickerData } from "Items/Sticker/StickerOperation";
import { TransformationData } from "Items/Transformation";
import { VideoItemData } from "Items/Video";
import { conf } from "Settings";
import { Descendant } from "slate";
import {ItemDataWithId} from "./Items/Item";
import {ListItemNode} from "./Items/RichText/Editor/BlockNode";

type MapTagByType = Record<ItemType, string>;
export const tagByType: MapTagByType = {
  Sticker: "sticker-item",
  Shape: "shape-item",
  RichText: "rich-text",
  Connector: "connector-item",
  Image: "image-item",
  Drawing: "drawing-item",
  Frame: "frame-item",
  AINode: "ainode-item",
  Video: "video-item",
  Audio: "audio-item",
  Placeholder: "",
  Comment: "comment-item",
  Group: "",
};

const headingTagsMap = {
  "h1": "heading_one",
  "h2": "heading_two",
  "h3": "heading_three",
  "h4": "heading_four",
  "h5": "heading_five",
} as const

type TagFactories = {
  [K in keyof MapTagByType as MapTagByType[K]]: (el: HTMLElement) => ItemDataWithId;
};
export const parsersHTML: TagFactories = {
  "sticker-item": parseHTMLSticker,
  "shape-item": parseHTMLShape,
  "rich-text": parseHTMLRichText,
  "connector-item": parseHTMLConnector,
  "image-item": parseHTMLImage,
  "drawing-item": parseHTMLDrawing,
  "frame-item": parseHTMLFrame,
  "ainode-item": parseHTMLAINode,
  "video-item": parseHTMLVideo,
  "audio-item": parseHTMLAudio,
  "comment-item": parseHTMLComment,
};

export const decodeHtml = (htmlString: string): string => {
  const parser = conf.getDOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.documentElement.textContent || "";
};

function getTransformationData(el: HTMLElement): TransformationData {
  const transformStyle = el.style.transform;
  const transformMatch = transformStyle.match(
    /translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^,]+),\s*([^)]+)\)/
  );
  if (transformMatch) {
    const [, translateX, translateY, scaleX, scaleY] =
      transformMatch.map(Number);
    const matrix = new Matrix(translateX, translateY, scaleX, scaleY);
    return { ...matrix, rotate: 0, isLocked: false };
  }

  return { ...new Matrix(), rotate: 0, isLocked: false };
}

function parseHTMLRichText(
  el: HTMLElement,
  options?: {
    insideOf: ItemType;
    realTransformation: TransformationData;
  }
): RichTextData & { id: string } {
  const parseNode = (node: HTMLElement, nestingLevel = 1): Descendant => {
    const isLinkNode = node.tagName.toLowerCase() === "a";
    if (
      node.tagName.toLowerCase() === "span" ||
      (isLinkNode && node.children.length === 0)
    ) {
      const isSingleSpace =
        node.textContent?.length === 1 && node.textContent?.trim() === "";
      const textContent = isSingleSpace ? "" : node.textContent || "";

      const text = textContent !== "" ? decodeHtml(textContent) : "";

      return {
        type: "text",
        text,
        link: isLinkNode ? node.getAttribute("href") || undefined : undefined,
        bold: node.style.fontWeight === "700",
        italic: node.style.fontStyle === "italic",
        underline: node.style.textDecoration.includes("underline"),
        "line-through": node.style.textDecoration.includes("line-through"),
        fontColor: node.style.color || conf.DEFAULT_TEXT_STYLES.fontColor,
        fontHighlight:
          node.style.backgroundColor || conf.DEFAULT_TEXT_STYLES.fontHighlight,
        fontSize:
          parseFloat(node.style.fontSize) || conf.DEFAULT_TEXT_STYLES.fontSize,
        fontFamily:
          node.style.fontFamily || conf.DEFAULT_TEXT_STYLES.fontFamily,
        overline: false,
        subscript: false,
        superscript: false,
      };
    }

    const children = Array.from(node.children).map((child) =>
      parseNode(child as HTMLElement, nestingLevel + 1)
    );
    const tagName = node.tagName.toLowerCase();

    // Функция для извлечения общих свойств
    const extractCommonProps = () => ({
      horisontalAlignment: (node.style.textAlign ||
        "left") as HorisontalAlignment,
      paddingTop: parseFloat(node.style.paddingTop) || undefined,
      paddingBottom: parseFloat(node.style.paddingBottom) || undefined,
    });

    // Обработка специальных элементов
    switch (tagName) {
      case "ul":
        return {
          type: "ul_list",
          ...extractCommonProps(),
          children: children as ListItemNode[],
          listLevel: nestingLevel,
        };

      case "ol":
        return {
          type: "ol_list",
          ...extractCommonProps(),
          children: children as ListItemNode[],
          listLevel: nestingLevel,
        };

      case "li":
        return {
          type: "list_item",
          ...extractCommonProps(),
          children: children as BlockNode[],
        };

      case "pre": {
        const codeElement = node.querySelector("code");
        const languageClass = codeElement?.className.match(/language-(\w+)/);

        return {
          type: "code_block",
          ...extractCommonProps(),
          language: languageClass?.[1] || null,
          children: codeElement
            ? Array.from(codeElement.children).map((child) =>
                parseNode(child as HTMLElement)
              ) as TextNode[]
            : [],
        };
      }

      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5": {
        return {
          type: headingTagsMap[tagName],
          ...extractCommonProps(),
          children: children as TextNode[],
        };
      }

      case "p":
        return {
          type: "paragraph",
          ...extractCommonProps(),
          lineHeight:
            parseFloat(node.style.lineHeight) ||
            conf.DEFAULT_TEXT_STYLES.lineHeight,
          children: children as TextNode[],
        };

      default:
        return {
          type: "paragraph",
          ...extractCommonProps(),
          children: children as TextNode[],
        };
    }
  };

  const children = Array.from(el.children)
    .filter((child) => !child.classList.contains("link-object"))
    .map((child) => parseNode(child as HTMLElement));

  const data: RichTextData & { id: string } = {
    id: el.id,
    itemType: "RichText",
    placeholderText: el.getAttribute("data-placeholder-text") || "",
    realSize: (el.getAttribute("data-real-size") === "auto" && "auto") || 0,
    linkTo: el.getAttribute("data-link-to") || undefined,
    maxWidth: parseInt(el.style.maxWidth),
    verticalAlignment:
      (el.getAttribute("data-vertical-alignment") as VerticalAlignment) ||
      "top",
    children,
  };

  if (options) {
    data.transformation = options.realTransformation;
    data.insideOf = options.insideOf;
  } else {
    data.insideOf = "RichText";
    data.transformation = getTransformationData(el);
  }

  return data;
}

function parseHTMLFrame(el: HTMLElement): {
  data: FrameData & { id: string };
  childrenMap: { [id: string]: ItemDataWithId };
} {
  const data: FrameData & { id: string } = {
    id: el.id,
    itemType: "Frame",
    shapeType: "Custom",
    // (el.getAttribute("data-shape-type") as FrameType) || "Custom",
    backgroundColor: el.style.backgroundColor || "",
    backgroundOpacity: parseFloat(el.style.opacity) || 1,
    borderColor: el.style.borderColor || "",
    borderWidth: parseInt(el.style.borderWidth) || 0,
    children: [],
    borderOpacity: 1,
    borderStyle: (el.style.borderStyle as BorderStyle) || "",
    linkTo: el.getAttribute("data-link-to") || undefined,
  };

  const defaultPath = Frames["Custom"].path.copy();
  const defaultMbr = defaultPath.getMbr();
  const scaleX = parseInt(el.style.width) / defaultMbr.getWidth();
  const scaleY = parseInt(el.style.height) / defaultMbr.getHeight();

  const transformation = getTransformationData(el);
  transformation.scaleX = scaleX;
  transformation.scaleY = scaleY;
  data.transformation = transformation;
  const text = el.querySelector(`#${CSS.escape(el.id)}_text`);
  if (text) {
    data.text = parseHTMLRichText(text as HTMLElement, {
      insideOf: "Frame",
      realTransformation: transformation,
    });
  }

  const childrenMap = Array.from(el.children)
    .filter(
      (child) =>
        child.id !== `${el.id}_text` && !child.classList.contains("link-object")
    )
    .map((child) => positionAbsolutely(child as HTMLElement, el))
    .reduce((acc: { [id: string]: ItemDataWithId }, child) => {
      acc[child.id] = parsersHTML[child.tagName.toLowerCase()](
        child as HTMLElement
      );
      return acc;
    }, {});
  data.children = Object.values(childrenMap).map((child) => child.id);

  return { data, childrenMap };
}

function parseHTMLShape(el: HTMLElement): ShapeData & { id: string } {
  const shapeData: ShapeData & { id: string } = {
    id: el.id,
    itemType: "Shape",
    shapeType: (el.getAttribute("data-shape-type") as ShapeType) || "Rectangle",
    backgroundOpacity: parseFloat(el.style.opacity) || 1,
    borderOpacity: 1,
    backgroundColor: el.getAttribute("fill") || "",
    borderColor: el.getAttribute("stroke") || "",
    borderWidth: parseInt(el.getAttribute("stroke-width") || "0"),
    borderStyle: (el.getAttribute("data-border-style") as BorderStyle) || "",
    transformation: getTransformationData(el),
    text: new DefaultRichTextData(),
    linkTo: el.getAttribute("data-link-to") || undefined,
  };

  const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
  if (textElement) {
    shapeData.text = parseHTMLRichText(textElement as HTMLElement, {
      insideOf: "Shape",
      realTransformation: shapeData.transformation,
    });
  }

  return shapeData;
}

function parseHTMLSticker(el: HTMLElement): StickerData & { id: string } {
  const transformation = getTransformationData(el);

  const stickerData: StickerData & { id: string } = {
    id: el.id,
    itemType: "Sticker",
    backgroundColor: el.style.backgroundColor || "",
    transformation,
    text: new DefaultRichTextData(),
    linkTo: el.getAttribute("data-link-to") || undefined,
  };

  const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
  if (textElement) {
    stickerData.text = parseHTMLRichText(textElement as HTMLElement, {
      insideOf: "Sticker",
      realTransformation: transformation,
    });
  }

  return stickerData;
}

function parseHTMLImage(el: HTMLElement): ImageItemData & { id: string } {
  const transformation = getTransformationData(el);

  const imageItemData: ImageItemData & { id: string } = {
    id: el.id,
    itemType: "Image",
    transformation,
    imageDimension: {
      width: parseInt(el.style.width),
      height: parseInt(el.style.height),
    },
    storageLink: el.style.backgroundImage.slice(5, -2), // Remove 'url("")'
    linkTo: el.getAttribute("data-link-to") || undefined,
  };

  return imageItemData;
}

function parseHTMLVideo(el: HTMLElement): VideoItemData & { id: string } {
  const transformation = getTransformationData(el);

  const videoItemData: VideoItemData & { id: string } = {
    id: el.id,
    itemType: "Video",
    transformation,
    videoDimension: {
      width: parseInt(el.style.width),
      height: parseInt(el.style.height),
    },
    url: el.getAttribute("video-url") || "",
    previewUrl: el.getAttribute("preview-url") || "",
    extension: el.getAttribute("extension") || "mp4",
    isStorageUrl: Boolean(el.getAttribute("is-storage-url")),
  };

  return videoItemData;
}

function parseHTMLAudio(el: HTMLElement): AudioItemData & { id: string } {
  const transformation = getTransformationData(el);

  const audioItemData: AudioItemData & { id: string } = {
    id: el.id,
    itemType: "Audio",
    transformation,
    isStorageUrl: !!el.getAttribute("is-storage-url") || false,
    url: el.getAttribute("audio-url") || "",
    extension: el.getAttribute("extension") || "mp3",
  };

  return audioItemData;
}

function parseHTMLComment(el: HTMLElement): CommentData & { id: string } {
  // const transformation = getTransformationData(el);
  const data = JSON.parse(el.getAttribute("comment-data")!) as CommentData;

  const commentItemData: CommentData & { id: string } = {
    id: el.id,
    ...data,
  };

  return commentItemData;
}

function parseHTMLConnector(el: HTMLElement): ConnectorData & { id: string } {
  const transformation = getTransformationData(el);

  const startItem = el.getAttribute("data-start-point-item");
  const startRelativeX = parseFloat(
    el.getAttribute("data-start-point-relative-x") || ""
  );
  const startRelativeY = parseFloat(
    el.getAttribute("data-start-point-relative-y") || ""
  );
  const startTangent = parseFloat(
    el.getAttribute("data-start-point-tangent") || ""
  );
  const startSegment = parseFloat(
    el.getAttribute("data-start-point-segment") || ""
  );
  const startPointType = el.getAttribute("data-start-point-type");
  const startPoint: ControlPointData = {
    pointType: startPointType as any,
    x: parseFloat(el.getAttribute("data-start-point-x") || "0"),
    y: parseFloat(el.getAttribute("data-start-point-y") || "0"),
    ...(startRelativeX ? { relativeX: startRelativeX } : {}),
    ...(startRelativeY ? { relativeY: startRelativeY } : {}),
    ...(startItem ? { itemId: startItem } : {}),
    ...(startPointType === "FixedConnector"
      ? { segment: startSegment, tangent: startTangent }
      : {}),
  };

  const endItem = el.getAttribute("data-end-point-item");
  const endRelativeX = parseFloat(
    el.getAttribute("data-end-point-relative-x") || ""
  );
  const endRelativeY = parseFloat(
    el.getAttribute("data-end-point-relative-y") || ""
  );
  const endTangent = parseFloat(
    el.getAttribute("data-end-point-tangent") || ""
  );
  const endSegment = parseFloat(
    el.getAttribute("data-end-point-segment") || ""
  );
  const endPointType = el.getAttribute("data-end-point-type");
  const endPoint: ControlPointData = {
    pointType: endPointType as any,
    x: parseFloat(el.getAttribute("data-end-point-x") || "0"),
    y: parseFloat(el.getAttribute("data-end-point-y") || "0"),
    ...(endItem ? { itemId: endItem } : {}),
    ...(endRelativeX ? { relativeX: endRelativeX } : {}),
    ...(endRelativeY ? { relativeY: endRelativeY } : {}),
    ...(endPointType === "FixedConnector"
      ? { segment: startSegment, tangent: endTangent }
      : {}),
  };

  const connectorData: ConnectorData & { id: string } = {
    middlePoint: null,
    id: el.id,
    itemType: "Connector",
    transformation,
    startPoint,
    endPoint,
    startPointerStyle:
      (el.getAttribute("data-start-pointer-style") as ConnectorPointerStyle) ||
      "None",
    endPointerStyle:
      (el.getAttribute("data-end-pointer-style") as ConnectorPointerStyle) ||
      "None",
    lineStyle:
      (el.getAttribute("data-line-style") as ConnectorLineStyle) || "straight",
    lineColor: el.getAttribute("data-line-color") || "",
    lineWidth: parseInt(
      el.getAttribute("data-line-width") || "1"
    ) as ConnectionLineWidth,
    borderStyle: (el.getAttribute("data-border-style") as BorderStyle) || "",
    text: new DefaultRichTextData(),
    linkTo: el.getAttribute("data-link-to") || undefined
  };

  const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
  if (textElement) {
    connectorData.text = parseHTMLRichText(textElement as HTMLElement, {
      insideOf: "Connector",
      realTransformation: transformation,
    });
  }

  return connectorData;
}

function parseHTMLDrawing(el: HTMLElement): DrawingData & { id: string } {
  const svg = el.querySelector("svg");
  const pathElement = svg?.querySelector("path");
  const pathData = pathElement?.getAttribute("d");
  if (!pathData || !pathElement || !svg) {
    throw new Error(`<drawing> with id ${el.id} wrong format`);
  }

  const points: { x: number; y: number }[] = [];
  const commands = pathData.match(/[MLQ][^MLQ]*/g) || [];

  for (const command of commands) {
    const type = command[0];
    const coords = command.slice(1).trim().split(/\s+/).map(Number);

    if (type === "M" || type === "L") {
      for (let i = 0; i < coords.length; i += 2) {
        const point = { x: coords[i], y: coords[i + 1] };
        points.push(point);
      }
    } else if (type === "Q") {
      for (let i = 0; i < coords.length; i += 4) {
        const endPoint = { x: coords[i], y: coords[i + 1] };
        points.push(endPoint);
      }
    }
  }

  const transformation = getTransformationData(el);

  return {
    id: el.id,
    itemType: "Drawing",
    points,
    transformation,
    strokeStyle: pathElement.getAttribute("stroke") || "",
    strokeWidth: parseFloat(pathElement.getAttribute("stroke-width") || "1"),
    linkTo: el.getAttribute("data-link-to") || undefined,
  };
}

function parseHTMLAINode(el: HTMLElement): AINodeData & { id: string } {
  const aiNodeData: AINodeData & { id: string } = {
    threadDirection: 3,
    id: el.id,
    itemType: "AINode",
    parentNodeId: el.getAttribute("parent-node-id") || undefined,
    isUserRequest: !!el.getAttribute("is-user-request") || false,
    contextItems: el.getAttribute("context-items")
      ? el.getAttribute("context-items")!.split(",")
      : [],
    transformation: getTransformationData(el),
    text: new DefaultRichTextData(),
    linkTo: el.getAttribute("data-link-to") || undefined
  };

  const textElement = el.querySelector(`#${CSS.escape(el.id)}_text`);
  if (textElement) {
    aiNodeData.text = parseHTMLRichText(textElement as HTMLElement, {
      insideOf: "Shape",
      realTransformation: aiNodeData.transformation,
    });
  }

  return aiNodeData;
}
