import { Board } from "Board";
import { Mbr, Point } from "Items";
import { ResizeType } from "Selection/Transformer/TransformerHelpers/getResizeType";
import { Comment } from "Items/Comment/Comment";
import { ApplyMatrixItem } from "Items/Transformation/TransformationOperations";

/** Minimal interface for BoardSelection to avoid circular dependencies */
export interface ISelection {
  items: {
    list(): any[];
  };
  transformMany(translations: ApplyMatrixItem[], timeStamp: number): void;
  shouldRenderItemsMbr: boolean;
}

/** Minimal interface for tools used during transformation */
export interface ITransformTools {
  canvasDrawer: any;
  alignmentHelper: any;
  debounceUpd: any;
}

export type TransformParams = {
  board: Board;
  selection: ISelection;
  tools: ITransformTools;
  resizeType: ResizeType;
  mbr: Mbr;
  oppositePoint: Point;
  isWidth: boolean;
  isHeight: boolean;
  isShiftPressed: boolean;
  beginTimeStamp: number;
  followingComments?: Comment[];
  startMbr?: Mbr;
  snapCursorPos: Point | null;
  setSnapCursorPos: (pos: Point | null) => void;
};

export type TransformResult = {
  resizedMbr: Mbr | null;
  translation?: ApplyMatrixItem[] | null;
  onPointerUpCb?: () => void;
};
