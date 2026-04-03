import { AddComment } from "Items/Comment/Tool/AddComment";
import { AddConnector } from "Items/Connector/Tool/AddConnector";
import { AddDrawing } from "Items/Drawing/Tool/AddDrawing";
import { AddHighlighter } from "Items/Drawing/Tool/AddHighlighter";
import { AddFrame } from "Items/Frame/Tool/AddFrame";
import { AddShape } from "Items/Shape/Tool/AddShape";
import { AddSticker } from "Items/Sticker/Tool/AddSticker";
import { AddText } from "Items/RichText/Tool/AddText";
import { Eraser } from "Items/Drawing/Tool/Eraser/Eraser";
import { ExportSnapshot } from "./ExportSnapshot/ExportSnapshot";
import { Navigate } from "./Navigate";
import { Select } from "./Select";

// This file ensures all built-in tools are registered.
// Tools are registered in their respective files via standalone registerTool calls.
// Importing them here triggers that registration.

export {
  AddComment,
  AddConnector,
  AddDrawing,
  AddHighlighter,
  AddFrame,
  AddShape,
  AddSticker,
  AddText,
  Eraser,
  ExportSnapshot,
  Navigate,
  Select,
};
