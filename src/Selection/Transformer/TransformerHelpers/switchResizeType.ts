import { Mbr, Point } from "Items";
import { ResizeType } from "./getResizeType";

/**
 * A function that switches the resize type when the pointer is moved over an opposite edge or corner.
 * Currently, it is unused. But leave it here, just in case we need it in the future.
 */
export function switchResizeType(
  resizeType: ResizeType,
  pointer: Point,
  mbr: Mbr
): ResizeType {
  const { left, top, right, bottom } = mbr;
  const { x, y } = pointer;
  switch (resizeType) {
    case "leftTop": {
      if (x < right && y < bottom) {
        return "leftTop";
      } else if (x > left && y > top) {
        return "rightBottom";
      } else if (x > left) {
        return "rightTop";
      } else {
        return "leftBottom";
      }
    }
    case "rightBottom": {
      if (x > left && y > top) {
        return "rightBottom";
      } else if (x < right && y < bottom) {
        return "leftTop";
      } else if (x < right) {
        return "leftBottom";
      } else {
        return "rightTop";
      }
    }
    case "rightTop": {
      if (x > left && y < bottom) {
        return "rightTop";
      } else if (x < right && y > top) {
        return "leftBottom";
      } else if (x < right) {
        return "leftTop";
      } else {
        return "rightBottom";
      }
    }
    case "leftBottom": {
      if (x < right && y > top) {
        return "leftBottom";
      } else if (x > left && y < bottom) {
        return "rightTop";
      } else if (x > left) {
        return "rightBottom";
      } else {
        return "leftTop";
      }
    }
    case "top": {
      return y < bottom ? "top" : "bottom";
    }
    case "bottom": {
      return y > top ? "bottom" : "top";
    }
    case "right": {
      return x > left ? "right" : "left";
    }
    case "left": {
      return x < right ? "left" : "right";
    }
  }
}
