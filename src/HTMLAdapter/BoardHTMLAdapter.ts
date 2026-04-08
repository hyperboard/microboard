import type { Board } from "Board";
import {
  deserializeLegacyHTMLAndEmitToBoard,
  deserializeLegacyHTMLToBoard,
  parseLegacyHTML,
  serializeBoardToLegacyHTML,
} from "./LegacyBoardHTMLAdapter";

export function parseHTML(el: HTMLElement) {
  return parseLegacyHTML(el);
}

export function serializeBoardToHTML(board: Board): string {
  // Temporary fallback: packaged HTML codec is disabled while deploys cannot
  // resolve the local WebComponentJSONCodec file dependency.
  return serializeBoardToLegacyHTML(board);
}

export function deserializeHTMLAndEmitToBoard(
  board: Board,
  stringedHTML: string,
): string[] {
  return deserializeLegacyHTMLAndEmitToBoard(board, stringedHTML);
}

export function deserializeHTMLToBoard(
  board: Board,
  stringedHTML: string,
): void {
  deserializeLegacyHTMLToBoard(board, stringedHTML);
}
