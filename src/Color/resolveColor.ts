import { ColorValue, ColorRole, Theme } from './ColorValue';
import { CONTRAST_PALETTE } from './ContrastPalette';

/**
 * Resolve a `ColorValue` to a concrete CSS colour string for rendering.
 *
 * @param value  The stored colour — either a semantic ID or a fixed string.
 * @param theme  The active display theme (`'light'` or `'dark'`).
 * @param role   Whether this colour is used as a `'background'` surface or a
 *               `'foreground'` element (text, stroke, icon).
 *
 * Resolution rules for semantic colours:
 * ```
 *              light mode       dark mode
 *  background  pair.light  →   pair.dark
 *  foreground  pair.dark   →   pair.light
 * ```
 * Fixed colours are returned unchanged regardless of theme or role.
 */
export function resolveColor(
  value: ColorValue | string,
  theme: Theme,
  role: ColorRole
): string {
  // Accept plain strings for backward compatibility (treat as fixed color).
  if (typeof value === 'string') return value;

  if (value.type === 'fixed') {
    return value.value;
  }

  const pair = CONTRAST_PALETTE[value.id];
  const lightMode = theme === 'light';

  if (role === 'background') {
    return lightMode ? pair.light : pair.dark;
  } else {
    return lightMode ? pair.dark : pair.light;
  }
}

/**
 * Resolve the *paired* foreground colour for a given background ColorValue.
 *
 * When a semantic colour is used as a background, this returns the guaranteed
 * accessible foreground for the same pair. For fixed colours it falls back to
 * a neutral dark or light foreground depending on theme.
 */
export function resolvePairedForeground(
  background: ColorValue,
  theme: Theme
): string {
  if (background.type === 'semantic') {
    return resolveColor(background, theme, 'foreground');
  }
  // Fixed colour: fall back to neutral pair foreground so text is at least
  // readable in the majority of cases.
  return theme === 'light'
    ? CONTRAST_PALETTE.contrastNeutral.dark
    : CONTRAST_PALETTE.contrastNeutral.light;
}
