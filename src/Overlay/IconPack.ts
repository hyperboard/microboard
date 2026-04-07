import type { OverlayIcon, OverlayIconStateHint } from "./OverlayMetadata";

export const OVERLAY_ICON_ASSET_PREFIX = "overlay-icons/";
export const OVERLAY_ICON_SPRITE_PATH = normalizeOverlayIconAssetPath("src/Overlay/overlay-icons.svg");

export function normalizeOverlayIconAssetPath(sourcePath: string): string {
  return sourcePath.startsWith("src/")
    ? `${OVERLAY_ICON_ASSET_PREFIX}${sourcePath.slice(4)}`
    : sourcePath;
}

export function overlaySymbolIcon(key: string): OverlayIcon {
  return {
    kind: "symbol",
    key,
    sourcePath: OVERLAY_ICON_SPRITE_PATH,
  };
}

export function overlayAssetIcon(
  sourcePath: string,
  state?: OverlayIconStateHint,
): OverlayIcon {
  const path = normalizeOverlayIconAssetPath(sourcePath);
  return state
    ? {
        kind: "asset",
        path,
        sourcePath,
        mimeType: "image/svg+xml",
        state,
      }
    : {
        kind: "asset",
        path,
        sourcePath,
        mimeType: "image/svg+xml",
      };
}
