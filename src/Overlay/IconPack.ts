import type { OverlayIcon, OverlayIconStateHint } from "./OverlayMetadata";

export const OVERLAY_ICON_SPRITE_PATH = "src/Overlay/overlay-icons.svg";

export function overlaySymbolIcon(key: string): OverlayIcon {
  return {
    kind: "symbol",
    key,
    sourcePath: OVERLAY_ICON_SPRITE_PATH,
  };
}

export function overlayAssetIcon(
  path: string,
  state?: OverlayIconStateHint,
): OverlayIcon {
  return state
    ? {
        kind: "asset",
        path,
        mimeType: "image/svg+xml",
        state,
      }
    : {
        kind: "asset",
        path,
        mimeType: "image/svg+xml",
      };
}
