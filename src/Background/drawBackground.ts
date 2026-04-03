import { DrawingContext } from 'Geometry/DrawingContext';
import { conf } from 'Settings';

// Background surface colors per theme
const BG_LIGHT = 'rgb(248, 249, 251)';
const BG_DARK  = 'rgb(17, 18, 23)';

// Grid line base alphas per level (index 0 = finest, increasing coarseness)
const GRID_LEVELS = [
  { world: 1,     lightAlpha: 0.05, darkAlpha: 0.04 },
  { world: 10,    lightAlpha: 0.07, darkAlpha: 0.06 },
  { world: 100,   lightAlpha: 0.11, darkAlpha: 0.09 },
  { world: 1000,  lightAlpha: 0.17, darkAlpha: 0.14 },
  { world: 10000, lightAlpha: 0.24, darkAlpha: 0.20 },
] as const;

// Grid lines fade in when their pixel spacing reaches FADE_START,
// and reach full opacity at FADE_FULL.
const FADE_START = 6;
const FADE_FULL  = 20;

/**
 * Draw the board background (solid fill + adaptive multi-level grid) for the
 * current frame. Call this after `DrawingContext.clear()` and before rendering
 * items so that the grid sits beneath all content.
 *
 * The grid uses fixed world-space intervals (1, 10, 100, 1000, 10 000 units).
 * Each level fades in smoothly once its screen-pixel spacing exceeds a minimum
 * threshold, so the density adapts to the current zoom without abrupt jumps.
 * The grid is purely visual — it has no snapping behaviour.
 */
export function drawBackground(context: DrawingContext): void {
  const { ctx, camera } = context;
  const dpi = context.dpi();
  const { width, height } = camera.window;
  const matrix = camera.getMatrix();
  const scale  = matrix.scaleX;
  const tx     = matrix.translateX;
  const ty     = matrix.translateY;

  const isLight = conf.theme === 'light';

  ctx.save();
  // Work in CSS-pixel screen space (DPI-scaled, but not camera-transformed)
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);

  // ── Background fill ──────────────────────────────────────────────────────
  ctx.fillStyle = isLight ? BG_LIGHT : BG_DARK;
  ctx.fillRect(0, 0, width, height);

  // ── Grid ─────────────────────────────────────────────────────────────────
  const gridColor = isLight ? '0,0,0' : '255,255,255';
  ctx.lineWidth = 1;

  for (const level of GRID_LEVELS) {
    const px = level.world * scale; // spacing in CSS pixels

    if (px < FADE_START) continue; // too dense — skip entirely

    // Smooth fade-in between FADE_START and FADE_FULL
    const fade  = Math.min(1, (px - FADE_START) / (FADE_FULL - FADE_START));
    const alpha = (isLight ? level.lightAlpha : level.darkAlpha) * fade;

    ctx.strokeStyle = `rgba(${gridColor},${alpha})`;
    ctx.beginPath();

    // Offset of the first visible grid line (in CSS pixels)
    const ox = ((tx % px) + px) % px;
    const oy = ((ty % px) + px) % px;

    for (let x = ox; x <= width; x += px) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = oy; y <= height; y += px) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  }

  ctx.restore();
}
