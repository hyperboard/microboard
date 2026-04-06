import type { OverlayIcon, OverlayIconStateHint } from "./OverlayMetadata";

export const OVERLAY_SYMBOL_KEYS = {
  styleFill: "style.fill",
  styleStroke: "style.stroke",
  styleColor: "style.color",
  styleFontSize: "style.fontSize",
} as const;

export function symbolIcon(
  key: string,
  state?: OverlayIconStateHint,
): OverlayIcon {
  return state ? { kind: "symbol", key, state } : { kind: "symbol", key };
}

export function styleFillIcon(state?: OverlayIconStateHint): OverlayIcon {
  return symbolIcon(OVERLAY_SYMBOL_KEYS.styleFill, state);
}

export function styleStrokeIcon(state?: OverlayIconStateHint): OverlayIcon {
  return symbolIcon(OVERLAY_SYMBOL_KEYS.styleStroke, state);
}

export function styleColorIcon(state?: OverlayIconStateHint): OverlayIcon {
  return symbolIcon(OVERLAY_SYMBOL_KEYS.styleColor, state);
}

export function styleFontSizeIcon(state?: OverlayIconStateHint): OverlayIcon {
  return symbolIcon(OVERLAY_SYMBOL_KEYS.styleFontSize, state);
}
