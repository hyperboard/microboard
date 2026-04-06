import type { OverlayIcon, OverlayIconStateHint } from "./OverlayMetadata";
import { OVERLAY_ICON_SPRITE_PATH, overlayAssetIcon } from "./IconPack";

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
  return state
    ? { kind: "symbol", key, sourcePath: OVERLAY_ICON_SPRITE_PATH, state }
    : { kind: "symbol", key, sourcePath: OVERLAY_ICON_SPRITE_PATH };
}

export function styleFillIcon(state?: OverlayIconStateHint): OverlayIcon {
  return overlayAssetIcon("src/Items/Shape/icons/Fill.icon.svg", state);
}

export function styleStrokeIcon(state?: OverlayIconStateHint): OverlayIcon {
  return overlayAssetIcon("src/Items/Shape/icons/Stroke.icon.svg", state);
}

export function styleColorIcon(state?: OverlayIconStateHint): OverlayIcon {
  return overlayAssetIcon("src/Items/Shape/icons/Color.icon.svg", state);
}

export function styleFontSizeIcon(state?: OverlayIconStateHint): OverlayIcon {
  return overlayAssetIcon("src/Items/RichText/icons/FontSize.icon.svg", state);
}
