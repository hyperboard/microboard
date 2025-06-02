import { Point, Mbr, Matrix } from "Items/index";
import { getResizedMbr } from "./getResizedMbr.ts";
import { ResizeType } from "./getResizeType.ts";

export function getResize(
  resizeType: ResizeType,
  pointer: Point,
  mbr: Mbr,
  opposite: Point
): { matrix: Matrix; mbr: Mbr } {
  const oldWidth = notLessThanOne(mbr.getWidth());
  const oldHeight = notLessThanOne(mbr.getHeight());
  const newMbr = getResizedMbr(resizeType, pointer, mbr, opposite);
  const newWidth = notLessThanOne(newMbr.getWidth());
  const newHeight = notLessThanOne(newMbr.getHeight());
  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;
  const translateX = newMbr.left - mbr.left;
  const translateY = newMbr.top - mbr.top;
  const matrix = new Matrix(translateX, translateY, scaleX, scaleY);
  return {
    matrix,
    mbr: newMbr,
  };
}

export function getProportionalResize(
  resizeType: ResizeType,
  pointer: Point,
  mbr: Mbr,
  opposite: Point
): { matrix: Matrix; mbr: Mbr } {
  const resizedMbr = getResizedMbr(resizeType, pointer, mbr, opposite);

  const oldWidth = notLessThanOne(mbr.getWidth());
  const oldHeight = notLessThanOne(mbr.getHeight());

  // Calculate a uniform scale factor depending on handle
  const originalHyp = Math.hypot(oldWidth, oldHeight);
  let ratio: number;

  if (resizeType === "left" || resizeType === "right") {
    // horizontal drag → width drives the ratio
    const width = resizedMbr.getWidth();
    ratio = notLessThanOne(width) / oldWidth;
  } else if (resizeType === "top" || resizeType === "bottom") {
    // vertical drag → height drives the ratio
    const height = resizedMbr.getHeight();
    ratio = notLessThanOne(height) / oldHeight;
  } else {
    // corner drag → diagonal drives the ratio
    const hyp = resizedMbr.getHypotenuse();
    ratio = notLessThanOne(hyp) / originalHyp;
  }

  let newWidth = notLessThanOne(oldWidth * ratio);
  let newHeight = notLessThanOne(oldHeight * ratio);
  let scaleX = ratio;
  let scaleY = ratio;

  const { x, y } = pointer;
  let newMbr = new Mbr();

  switch (resizeType) {
    case "leftTop": {
      if (x < opposite.x && y < opposite.y) {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y - newHeight,
          opposite.x,
          opposite.y
        );
      } else if (x > opposite.x && y > opposite.y) {
        newMbr = new Mbr(
          opposite.x,
          opposite.y,
          opposite.x + newWidth,
          opposite.y + newHeight
        );
      } else if (x > opposite.x) {
        newMbr = new Mbr(
          opposite.x,
          opposite.y - newHeight,
          opposite.x + newWidth,
          opposite.y
        );
      } else {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y,
          opposite.x,
          opposite.y + newHeight
        );
      }
      break;
    }
    case "rightBottom": {
      if (x > opposite.x && y > opposite.y) {
        newMbr = new Mbr(
          opposite.x,
          opposite.y,
          opposite.x + newWidth,
          opposite.y + newHeight
        );
      } else if (x < opposite.x && y < opposite.y) {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y - newHeight,
          opposite.x,
          opposite.y
        );
      } else if (x < opposite.x) {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y,
          opposite.x,
          opposite.y + newHeight
        );
      } else {
        newMbr = new Mbr(
          opposite.x,
          opposite.y - newHeight,
          opposite.x + newWidth,
          opposite.y
        );
      }
      break;
    }
    case "rightTop": {
      if (x > opposite.x && y < opposite.y) {
        newMbr = new Mbr(
          opposite.x,
          opposite.y - newHeight,
          opposite.x + newWidth,
          opposite.y
        );
      } else if (x < opposite.x && y > opposite.y) {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y,
          opposite.x,
          opposite.y + newHeight
        );
      } else if (x < opposite.x) {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y - newHeight,
          opposite.x,
          opposite.y
        );
      } else {
        newMbr = new Mbr(
          opposite.x,
          opposite.y,
          opposite.x + newWidth,
          opposite.y + newHeight
        );
      }
      break;
    }
    case "leftBottom": {
      if (x < opposite.x && y > opposite.y) {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y,
          opposite.x,
          opposite.y + newHeight
        );
      } else if (x > opposite.x && y < opposite.y) {
        newMbr = new Mbr(
          opposite.x,
          opposite.y - newHeight,
          opposite.x + newWidth,
          opposite.y
        );
      } else if (x > opposite.x) {
        newMbr = new Mbr(
          opposite.x,
          opposite.y,
          opposite.x + newWidth,
          opposite.y + newHeight
        );
      } else {
        newMbr = new Mbr(
          opposite.x - newWidth,
          opposite.y - newHeight,
          opposite.x,
          opposite.y
        );
      }
      break;
    }
    case "left":
    case "right": {
      if (resizeType === "left") {
        if (x < opposite.x && y > opposite.y) {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y,
            opposite.x,
            opposite.y + newHeight
          );
        } else if (x > opposite.x && y < opposite.y) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y - newHeight,
            opposite.x + newWidth,
            opposite.y
          );
        } else if (x > opposite.x) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y,
            opposite.x + newWidth,
            opposite.y + newHeight
          );
        } else {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y - newHeight,
            opposite.x,
            opposite.y
          );
        }
      } else {
        if (x > opposite.x && y > opposite.y) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y,
            opposite.x + newWidth,
            opposite.y + newHeight
          );
        } else if (x < opposite.x && y < opposite.y) {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y - newHeight,
            opposite.x,
            opposite.y
          );
        } else if (x < opposite.x) {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y,
            opposite.x,
            opposite.y + newHeight
          );
        } else {
          newMbr = new Mbr(
            opposite.x,
            opposite.y - newHeight,
            opposite.x + newWidth,
            opposite.y
          );
        }
        break;
      }
      break;
    }
    case "top":
    case "bottom": {
      if (resizeType === "top") {
        if (x < opposite.x && y < opposite.y) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y - newHeight,
            opposite.x + newWidth,
            opposite.y
          );
        } else if (x > opposite.x && y > opposite.y) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y,
            opposite.x + newWidth,
            opposite.y + newHeight
          );
        } else if (x > opposite.x) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y - newHeight,
            opposite.x + newWidth,
            opposite.y
          );
        } else {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y - newHeight,
            opposite.x,
            opposite.y
          );
        }
      } else {
        if (x > opposite.x && y < opposite.y) {
          newMbr = new Mbr(
            opposite.x,
            opposite.y - newHeight,
            opposite.x + newWidth,
            opposite.y
          );
        } else if (x < opposite.x && y > opposite.y) {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y,
            opposite.x,
            opposite.y + newHeight
          );
        } else if (x < opposite.x) {
          newMbr = new Mbr(
            opposite.x - newWidth,
            opposite.y - newHeight,
            opposite.x,
            opposite.y
          );
        } else {
          newMbr = new Mbr(
            opposite.x,
            opposite.y,
            opposite.x + newWidth,
            opposite.y + newHeight
          );
        }
      }
      break;
    }
    default: {
      newMbr = resizedMbr;
      newWidth = notLessThanOne(newMbr.getWidth());
      newHeight = notLessThanOne(newMbr.getHeight());
      scaleX = newWidth / oldWidth;
      scaleY = newHeight / oldHeight;
    }
  }
  const translateX = newMbr.left - mbr.left;
  const translateY = newMbr.top - mbr.top;
  const matrix = new Matrix(translateX, translateY, scaleX, scaleY);
  return {
    matrix,
    mbr: newMbr,
  };
}

/**
 * This Function would not allow dimensions to get smaller than 1.
 * Why do we have to limit the minimum width and height?
 * If either width or height would reach 0, we would not be able to ever increase their size.
 * And we would lose all the relative positions of items iside of selection to each other.
 */
function notLessThanOne(number: number): number {
  return number > 0.00001 ? number : 0.00001;
}
