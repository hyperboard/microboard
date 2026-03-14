import { describe, expect, test } from 'bun:test';
import {
  cssContrastRatio,
  meetsWCAG_AA,
  meetsWCAG_AAA,
  parseCssRgb,
  relativeLuminance,
  contrastRatio,
  srgbChannelToLinear,
} from './colorUtils';
import { CONTRAST_PALETTE, CONTRAST_PALETTE_LIST } from './ContrastPalette';
import { resolveColor, resolvePairedForeground } from './resolveColor';
import { fixedColor, semanticColor } from './ColorValue';

describe('srgbChannelToLinear', () => {
  test('black → 0', () => expect(srgbChannelToLinear(0)).toBeCloseTo(0));
  test('white → 1', () => expect(srgbChannelToLinear(255)).toBeCloseTo(1));
  test('mid-gray linearises correctly', () => {
    // 128/255 ≈ 0.502 sRGB → ≈ 0.216 linear
    expect(srgbChannelToLinear(128)).toBeCloseTo(0.2158, 3);
  });
});

describe('relativeLuminance', () => {
  test('black has luminance 0', () => expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0));
  test('white has luminance 1', () => expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1));
  test('pure red is approximately 0.2126', () =>
    expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 3));
});

describe('contrastRatio', () => {
  test('white on black is 21:1', () =>
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 0));
  test('same colour is 1:1', () =>
    expect(contrastRatio(0.5, 0.5)).toBeCloseTo(1));
  test('order does not matter', () =>
    expect(contrastRatio(0.1, 0.8)).toBeCloseTo(contrastRatio(0.8, 0.1)));
});

describe('parseCssRgb', () => {
  test('parses rgb()', () =>
    expect(parseCssRgb('rgb(10, 20, 30)')).toEqual([10, 20, 30]));
  test('parses rgba()', () =>
    expect(parseCssRgb('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30]));
  test('returns null for unparseable input', () =>
    expect(parseCssRgb('none')).toBeNull());
  test('returns null for hex', () =>
    expect(parseCssRgb('#ff0000')).toBeNull());
});

describe('CONTRAST_PALETTE — WCAG compliance', () => {
  test('every semantic pair meets WCAG AA (4.5:1)', () => {
    for (const pair of CONTRAST_PALETTE_LIST) {
      const ratio = cssContrastRatio(pair.light, pair.dark);
      expect(ratio).not.toBeNull();
      expect(meetsWCAG_AA(ratio!)).toBe(true);
    }
  });

  test('every semantic pair meets WCAG AAA (7:1)', () => {
    for (const pair of CONTRAST_PALETTE_LIST) {
      const ratio = cssContrastRatio(pair.light, pair.dark);
      expect(meetsWCAG_AAA(ratio!)).toBe(true);
    }
  });

  test('stored contrastRatio values are accurate (within 0.5)', () => {
    for (const pair of CONTRAST_PALETTE_LIST) {
      const actual = cssContrastRatio(pair.light, pair.dark)!;
      expect(Math.abs(actual - pair.contrastRatio)).toBeLessThan(0.5);
    }
  });

  test('all 11 semantic colours are present', () => {
    expect(CONTRAST_PALETTE_LIST).toHaveLength(11);
  });
});

describe('resolveColor', () => {
  test('fixed colour is returned unchanged in light mode', () => {
    const c = fixedColor('rgb(255, 0, 0)');
    expect(resolveColor(c, 'light', 'background')).toBe('rgb(255, 0, 0)');
    expect(resolveColor(c, 'dark', 'foreground')).toBe('rgb(255, 0, 0)');
  });

  test('semantic background: light mode → pair.light', () => {
    const c = semanticColor('contrastBlue');
    expect(resolveColor(c, 'light', 'background')).toBe(
      CONTRAST_PALETTE.contrastBlue.light
    );
  });

  test('semantic foreground: light mode → pair.dark', () => {
    const c = semanticColor('contrastBlue');
    expect(resolveColor(c, 'light', 'foreground')).toBe(
      CONTRAST_PALETTE.contrastBlue.dark
    );
  });

  test('semantic background: dark mode → pair.dark', () => {
    const c = semanticColor('contrastBlue');
    expect(resolveColor(c, 'dark', 'background')).toBe(
      CONTRAST_PALETTE.contrastBlue.dark
    );
  });

  test('semantic foreground: dark mode → pair.light', () => {
    const c = semanticColor('contrastBlue');
    expect(resolveColor(c, 'dark', 'foreground')).toBe(
      CONTRAST_PALETTE.contrastBlue.light
    );
  });

  test('all semantic colours resolve in both themes without throwing', () => {
    for (const pair of CONTRAST_PALETTE_LIST) {
      const c = semanticColor(pair.id);
      expect(() => resolveColor(c, 'light', 'background')).not.toThrow();
      expect(() => resolveColor(c, 'dark', 'background')).not.toThrow();
    }
  });
});

describe('resolvePairedForeground', () => {
  test('returns dark variant of pair in light mode for semantic bg', () => {
    const bg = semanticColor('contrastRed');
    expect(resolvePairedForeground(bg, 'light')).toBe(
      CONTRAST_PALETTE.contrastRed.dark
    );
  });

  test('returns light variant of pair in dark mode for semantic bg', () => {
    const bg = semanticColor('contrastRed');
    expect(resolvePairedForeground(bg, 'dark')).toBe(
      CONTRAST_PALETTE.contrastRed.light
    );
  });

  test('fixed bg falls back to neutral dark in light mode', () => {
    const bg = fixedColor('rgb(100, 200, 50)');
    expect(resolvePairedForeground(bg, 'light')).toBe(
      CONTRAST_PALETTE.contrastNeutral.dark
    );
  });

  test('fixed bg falls back to neutral light in dark mode', () => {
    const bg = fixedColor('rgb(100, 200, 50)');
    expect(resolvePairedForeground(bg, 'dark')).toBe(
      CONTRAST_PALETTE.contrastNeutral.light
    );
  });
});
