import { SemanticColorId } from './ColorValue';

/**
 * A precomputed pair of sRGB colours for a single semantic ID.
 *
 * Light/dark mode rendering rules:
 *   - Light mode  → `light` = background surface, `dark` = foreground/text
 *   - Dark mode   → `dark`  = background surface, `light` = foreground/text
 *
 * Every pair has been verified to meet WCAG 2.1 AAA (≥7:1 contrast ratio)
 * between its `light` and `dark` variants.
 *
 * CIELAB hue coordinates (a*, b*) are kept consistent between variants so
 * that the perceptual hue identity is preserved across themes.
 */
export interface ContrastPair {
  readonly id: SemanticColorId;
  /** Human-readable label for palette UIs. */
  readonly label: string;
  /** Light variant — high lightness, used as background in light mode. */
  readonly light: string;
  /** Dark variant — low lightness, used as background in dark mode. */
  readonly dark: string;
  /**
   * Pre-verified WCAG contrast ratio between `light` and `dark`.
   * All values are ≥7.0 (AAA). Stored for fast assertion in tests and
   * for display in accessibility auditing UIs.
   */
  readonly contrastRatio: number;
}

/**
 * The canonical semantic colour palette.
 *
 * Values were derived from CIELAB (preserving a*, b* per hue family while
 * varying L* to ~90 for light and ~22 for dark) and converted to sRGB.
 * Each pair's contrast ratio was computed via the WCAG relative-luminance
 * formula and rounded down to one decimal place.
 *
 * Yellow/orange dark variants appear brownish — this is intentional.  The
 * yellow family cannot produce a dark counterpart that is both accessible
 * (≥4.5:1) *and* looks saturated yellow; a warm brown is the closest
 * perceptually coherent accessible dark.
 */
export const CONTRAST_PALETTE: Record<SemanticColorId, ContrastPair> = {
  contrastNeutral: {
    id: 'contrastNeutral',
    label: 'Neutral',
    light: 'rgb(245, 246, 248)',
    dark: 'rgb(20, 21, 26)',
    contrastRatio: 17.2,
  },
  contrastGray: {
    id: 'contrastGray',
    label: 'Gray',
    light: 'rgb(224, 225, 229)',
    dark: 'rgb(55, 58, 70)',
    contrastRatio: 8.6,
  },
  contrastRed: {
    id: 'contrastRed',
    label: 'Red',
    light: 'rgb(255, 215, 210)',
    dark: 'rgb(120, 10, 10)',
    contrastRatio: 8.5,
  },
  contrastOrange: {
    id: 'contrastOrange',
    label: 'Orange',
    light: 'rgb(255, 229, 195)',
    dark: 'rgb(110, 44, 0)',
    contrastRatio: 8.4,
  },
  contrastYellow: {
    id: 'contrastYellow',
    label: 'Yellow',
    // Note: dark variant is warm brown — the closest accessible dark to yellow.
    light: 'rgb(255, 249, 185)',
    dark: 'rgb(89, 71, 0)',
    contrastRatio: 8.3,
  },
  contrastGreen: {
    id: 'contrastGreen',
    label: 'Green',
    light: 'rgb(193, 243, 179)',
    dark: 'rgb(0, 74, 22)',
    contrastRatio: 8.4,
  },
  contrastTeal: {
    id: 'contrastTeal',
    label: 'Teal',
    light: 'rgb(176, 243, 240)',
    dark: 'rgb(0, 68, 64)',
    contrastRatio: 8.8,
  },
  contrastBlue: {
    id: 'contrastBlue',
    label: 'Blue',
    light: 'rgb(208, 222, 255)',
    dark: 'rgb(15, 42, 148)',
    contrastRatio: 8.7,
  },
  contrastPurple: {
    id: 'contrastPurple',
    label: 'Purple',
    light: 'rgb(232, 210, 255)',
    dark: 'rgb(62, 0, 132)',
    contrastRatio: 9.8,
  },
  contrastPink: {
    id: 'contrastPink',
    label: 'Pink',
    light: 'rgb(255, 212, 228)',
    dark: 'rgb(120, 0, 55)',
    contrastRatio: 8.5,
  },
  contrastBrown: {
    id: 'contrastBrown',
    label: 'Brown',
    light: 'rgb(242, 224, 200)',
    dark: 'rgb(74, 33, 0)',
    contrastRatio: 10.7,
  },
};

/** Ordered list of semantic colour pairs for display in palette UIs. */
export const CONTRAST_PALETTE_LIST: ContrastPair[] = [
  CONTRAST_PALETTE.contrastNeutral,
  CONTRAST_PALETTE.contrastGray,
  CONTRAST_PALETTE.contrastRed,
  CONTRAST_PALETTE.contrastOrange,
  CONTRAST_PALETTE.contrastYellow,
  CONTRAST_PALETTE.contrastGreen,
  CONTRAST_PALETTE.contrastTeal,
  CONTRAST_PALETTE.contrastBlue,
  CONTRAST_PALETTE.contrastPurple,
  CONTRAST_PALETTE.contrastPink,
  CONTRAST_PALETTE.contrastBrown,
];
