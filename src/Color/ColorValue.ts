/**
 * The two display modes. Items using semantic colors automatically adapt
 * their light/dark variants based on this setting.
 */
export type Theme = 'light' | 'dark';

/**
 * Which role a color plays in a light/dark pair.
 * - 'background' → the item's fill / container surface
 * - 'foreground' → text, strokes, icons drawn on top of the background
 */
export type ColorRole = 'background' | 'foreground';

/**
 * All semantic color identifiers. Each ID maps to a ContrastPair in the
 * palette — a light variant and a dark variant that together achieve ≥4.5:1
 * WCAG AA contrast when used as a background/foreground pair.
 */
export const SEMANTIC_COLOR_IDS = [
  'contrastNeutral',
  'contrastGray',
  'contrastRed',
  'contrastOrange',
  'contrastYellow',
  'contrastGreen',
  'contrastTeal',
  'contrastBlue',
  'contrastPurple',
  'contrastPink',
  'contrastBrown',
] as const;

export type SemanticColorId = (typeof SEMANTIC_COLOR_IDS)[number];

/**
 * A theme-aware color that resolves to its light or dark variant at render
 * time based on the active Theme. Using semantic colors guarantees ≥4.5:1
 * contrast between any background/foreground pair from the same ID.
 */
export interface SemanticColor {
  readonly type: 'semantic';
  readonly id: SemanticColorId;
}

/**
 * A literal CSS color string (`rgb(…)`, `#rrggbb`, `rgba(…)`, `"none"`).
 * Fixed colors do not react to theme changes — they preserve user intent for
 * branding or artistic purposes.
 */
export interface FixedColor {
  readonly type: 'fixed';
  readonly value: string;
}

/**
 * The unified color value type used by all item data interfaces.
 * Replaces the previous bare `string` color fields.
 */
export type ColorValue = SemanticColor | FixedColor;

// ── Constructors ────────────────────────────────────────────────────────────

export const semanticColor = (id: SemanticColorId): SemanticColor => ({
  type: 'semantic',
  id,
});

export const fixedColor = (value: string): FixedColor => ({
  type: 'fixed',
  value,
});

/**
 * Coerce a legacy serialized string or an already-typed ColorValue into a
 * ColorValue. Strings become FixedColor so that existing boards load without
 * modification.
 */
export function coerceColorValue(value: string | ColorValue): ColorValue {
  if (typeof value === 'string') return fixedColor(value);
  return value;
}

/**
 * Coerce a legacy serialized string or ColorValue, allowing undefined
 * (returns undefined when input is undefined).
 */
export function coerceOptionalColorValue(
  value: string | ColorValue | undefined
): ColorValue | undefined {
  if (value === undefined) return undefined;
  return coerceColorValue(value);
}
