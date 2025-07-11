import { Point, Mbr } from "Items";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { conf } from "Settings";

export function getDecorationResizeType(
  point: Point,
  mbr: Mbr,
  tolerance = 10
): ResizeType | undefined {
  for (const key in conf.EXPORT_FRAME_DECORATIONS) {
    const decoration = conf.EXPORT_FRAME_DECORATIONS[key];
    const decorationBounds = {
      left: mbr.left + (decoration.offsetX ?? 0),
      top: mbr.top + (decoration.offsetY ?? 0),
      right: mbr.left + (decoration.offsetX ?? 0) + decoration.width,
      bottom: mbr.top + (decoration.offsetY ?? 0) + decoration.height,
    };

    if (
      point.x >= decorationBounds.left - tolerance &&
      point.x <= decorationBounds.right + tolerance &&
      point.y >= decorationBounds.top - tolerance &&
      point.y <= decorationBounds.bottom + tolerance
    ) {
      switch (key) {
        case "top-left":
          return "leftTop";
        case "top-right":
          return "rightTop";
        case "bottom-left":
          return "leftBottom";
        case "bottom-right":
          return "rightBottom";
      }
    }
  }

  return undefined;
}
