/**
 * WCAG 2.1 color-contrast utilities.
 *
 * All calculations follow the W3C specification:
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Convert a single sRGB channel value (0–255) to linear light. */
export function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance of an sRGB colour (channels 0–255).
 * Returns a value in [0, 1] where 0 = black, 1 = white.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/**
 * WCAG contrast ratio between two relative luminance values.
 * Returns a value ≥1 (1 = no contrast, 21 = black on white).
 */
export function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns true if the contrast ratio meets WCAG 2.1 AA (≥4.5:1). */
export function meetsWCAG_AA(ratio: number): boolean {
  return ratio >= 4.5;
}

/** Returns true if the contrast ratio meets WCAG 2.1 AAA (≥7:1). */
export function meetsWCAG_AAA(ratio: number): boolean {
  return ratio >= 7;
}

/**
 * Parse an `rgb(r, g, b)` or `rgba(r, g, b, a)` CSS string.
 * Returns `[r, g, b]` channels in [0, 255], or `null` if unparseable.
 */
export function parseCssRgb(css: string): [number, number, number] | null {
  const m = css.match(
    /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/
  );
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}

/**
 * Compute the WCAG contrast ratio between two CSS `rgb(…)` strings.
 * Returns `null` if either string cannot be parsed.
 */
export function cssContrastRatio(css1: string, css2: string): number | null {
  const rgb1 = parseCssRgb(css1);
  const rgb2 = parseCssRgb(css2);
  if (!rgb1 || !rgb2) return null;
  return contrastRatio(
    relativeLuminance(...rgb1),
    relativeLuminance(...rgb2)
  );
}
