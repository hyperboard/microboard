import { Board } from "Board";
import { Item, Point, Frame } from "Items";
import { DrawingContext } from "Items/DrawingContext";
import type { AddComment } from "Items/Comment/Tool/AddComment";
import type { AddConnector } from "Items/Connector/Tool/AddConnector";
import type { AddDrawing } from "Items/Drawing/Tool/AddDrawing";
import type { AddHighlighter } from "Items/Drawing/Tool/AddHighlighter";
import type { AddFrame } from "Items/Frame/Tool/AddFrame";
import type { AddShape } from "Items/Shape/Tool/AddShape";
import type { AddSticker } from "Items/Sticker/Tool/AddSticker";
import type { AddText } from "Items/RichText/Tool/AddText";
import { BoardTool } from "./BoardTool";
import type { Eraser } from "Items/Drawing/Tool/Eraser/Eraser";
import type { ExportSnapshot } from "./ExportSnapshot/ExportSnapshot";
import { Navigate } from "./Navigate";
import { Select } from "./Select";
import { ToolContext } from "./ToolContext";
import { Subject } from "Subject";
import { CustomTool } from "Tools/CustomTool";
import { Tool } from "./Tool";
import { isIframe } from "api/isIfarme";

import { registeredTools as registryRegisteredTools } from "../RegistryMaps";
export type { CustomToolConstructor } from "../RegistryMaps";
export const registeredTools = registryRegisteredTools;

export class Tools extends ToolContext {
  readonly subject = new Subject<Tools>();
  beforeNavigateMode: "navigate" | "select" = "navigate";

  constructor(protected board: Board) {
    super();
  }

  addRegisteredTool(toolName: string, clearSelection = false, ...args: any[]): void {
    if (this.board.getInterfaceType() !== "edit") {
      this.tool = new Navigate(this.board);
      return;
    }
    if (this.getAddRegisteredTool(toolName) && !isIframe()) {
      this.cancel();
    } else {
      const ToolClass = registeredTools[toolName];
      if (!ToolClass) {
        console.warn(`Tool with name "${toolName}" not found`);
        return;
      }

      this.tool = new ToolClass(this.board, ...args);
      if (clearSelection) {
        this.board.selection.removeAll();
      }
    }
    this.publish();
  }

  getAddRegisteredTool(toolName: string): Tool | undefined {
    const targetTool = registeredTools[toolName];
    return this.tool instanceof targetTool
      ? this.tool
      : undefined;
  }

  setTool(tool: BoardTool): void {
    this.tool = tool;
    this.publish();
  }

  switchMode(mode: "navigate" | "select"): void {
    this.beforeNavigateMode = mode;
  }

  navigate(): void {
    this.tool = new Navigate(this.board);
    this.publish();
  }

  getNavigate(): Navigate | undefined {
    return this.tool instanceof Navigate ? this.tool : undefined;
  }

  select(clearSelection = false): void {
    this.tool = new Select(this.board);
    this.board.pointer.setCursor("default");
    if (clearSelection) {
      this.board.selection.removeAll();
    }
    this.publish();
  }

  getSelect(): Select | undefined {
    return this.tool instanceof Select ? this.tool : undefined;
  }

  addSticker(clearSelection = false): void {
    this.addRegisteredTool("AddSticker", clearSelection);
  }

  addShape(clearSelection = false): void {
    this.addRegisteredTool("AddShape", clearSelection);
  }

  getAddShape(): AddShape | undefined {
    return this.getAddRegisteredTool("AddShape") as AddShape;
  }

  getAddSticker(): AddSticker | undefined {
    return this.getAddRegisteredTool("AddSticker") as AddSticker;
  }

  addText(clearSelection = false): void {
    this.addRegisteredTool("AddText", clearSelection);
  }

  getAddText(): AddText | undefined {
    return this.getAddRegisteredTool("AddText") as AddText;
  }

  addConnector(
    clearSelection = false,
    itemToStart?: Item,
    position?: Point
  ): void {
    this.addRegisteredTool("AddConnector", clearSelection, itemToStart, position);
  }

  getAddConnector(): AddConnector | undefined {
    return this.getAddRegisteredTool("AddConnector") as AddConnector;
  }

  addDrawing(clearSelection = false): void {
    this.addRegisteredTool("AddDrawing", clearSelection);
  }

  getAddDrawing(): AddDrawing | undefined {
    const tool = this.getAddRegisteredTool("AddDrawing");
    return tool && "isHighlighter" in tool && !(tool as any).isHighlighter()
      ? (tool as AddDrawing)
      : undefined;
  }

  addHighlighter(clearSelection = false): void {
    this.addRegisteredTool("AddHighlighter", clearSelection);
  }

  getAddHighlighter(): AddHighlighter | undefined {
    const tool = this.getAddRegisteredTool("AddHighlighter");
    return tool && "isHighlighter" in tool && (tool as any).isHighlighter()
      ? (tool as AddHighlighter)
      : undefined;
  }

  eraser(clearSelection = false): void {
    this.addRegisteredTool("Eraser", clearSelection);
  }

  getEraser(): Eraser | undefined {
    return this.getAddRegisteredTool("Eraser") as Eraser;
  }

  addComment(clearSelection = false): void {
    this.addRegisteredTool("AddComment", clearSelection);
  }

  getAddComment(): AddComment | undefined {
    return this.getAddRegisteredTool("AddComment") as AddComment;
  }

  export(): void {
    this.addRegisteredTool("ExportSnapshot");
  }

  getExport(): ExportSnapshot | undefined {
    return this.getAddRegisteredTool("ExportSnapshot") as ExportSnapshot;
  }

  addFrame(clearSelection = false): void {
    this.addRegisteredTool("AddFrame", clearSelection);
  }

  getAddFrame(): AddFrame | undefined {
    return this.getAddRegisteredTool("AddFrame") as AddFrame;
  }

  cancel(): void {
    if (this.board.getInterfaceType() !== "edit") {
      this.tool = new Navigate(this.board);
      return;
    }
    this.tool.onCancel();
    this.tool = new Select(this.board);
    this.publish();
  }

  confirm(): void {
    if (this.board.getInterfaceType() !== "edit") {
      this.tool = new Navigate(this.board);
      return;
    }
    this.tool.onConfirm();
    this.tool = new Select(this.board);
    this.publish();
  }

  publish(): void {
    this.board.isBoardMenuOpen = false;
    this.subject.publish(this);
  }

  sortFrames(): Frame[] {
    const frames = this.board.items.listAll().filter(item => item instanceof Frame);
    const sortedFrames = frames.sort((fr1, fr2) => {
      const mbr1 = fr1.getMbr();
      const mbr2 = fr2.getMbr();

      if (mbr1.left !== mbr2.left) {
        return mbr1.left - mbr2.left;
      }

      return mbr1.top - mbr2.top;
    });
    return sortedFrames;
  }

  getNewFrameIndex(frames: Frame[], direction: "next" | "prev"): number {
    const currentFrameId = localStorage.getItem(`lastVisitedFrame`);
    let currentFrameIndex = frames.findIndex(
      (frame) => frame.getId() === currentFrameId
    );

    if (currentFrameIndex < 0) {
      currentFrameIndex = 0;
    }

    const newIndex =
      direction === "prev" ? currentFrameIndex - 1 : currentFrameIndex + 1;

    if (direction === "prev" && newIndex < 0) {
      return frames.length - 1;
    }

    if (direction === "next" && newIndex > frames.length - 1) {
      return 0;
    }

    return newIndex;
  }

  frameNavigation(direction: "next" | "prev"): void {
    if (this.board.getInterfaceType() !== "edit") {
      this.tool = new Navigate(this.board);
      return;
    }

    const frames = this.sortFrames();
    if (frames.length === 0) {
      return;
    }

    const newFrameIndex = this.getNewFrameIndex(frames, direction);
    const frameMbr = frames[newFrameIndex]?.getMbr();
    const zoomOffset = 25;

    this.board.camera.zoomToFit(frameMbr, zoomOffset, 0);
    this.board.selection.removeAll();
    this.board.selection.add(frames[newFrameIndex]);
    this.board.selection.setContext("SelectUnderPointer");
    localStorage.setItem(`lastVisitedFrame`, frames[newFrameIndex].getId());
    this.publish();
  }

  setNavigateMode(isSpacePressed: boolean): void {
    const navigateActive = this.board.tools.getNavigate();
    if (!isSpacePressed) {
      this.board.tools.beforeNavigateMode = navigateActive
        ? "navigate"
        : "select";

      if (!navigateActive) {
        this.navigate();
      }
    }
  }

  exitNavigateMode(): void {
    if (this.board.tools.beforeNavigateMode === "select") {
      this.select();
    }
  }

  render(context: DrawingContext): void {
    this.tool.render(context);
  }
}
