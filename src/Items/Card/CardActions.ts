import type { ItemActionConfig } from "Items/ItemActions";

const FLIP_CARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
  <path d="M16 8l3-3 3 3"/>
  <line x1="19" y1="5" x2="19" y2="19"/>
  <path d="M16 16l3 3 3-3"/>
</svg>`;

const ROTATE_CCW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="1 4 1 10 7 10"/>
  <path d="M3.51 15a9 9 0 1 0 .49-4"/>
</svg>`;

const ROTATE_CW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="23 4 23 10 17 10"/>
  <path d="M20.49 15a9 9 0 1 1-.49-4"/>
</svg>`;

export const cardActions: ItemActionConfig = {
  contextPanel: [
    {
      kind: "custom",
      tooltip: "Flip card",
      button: { kind: "icon", svg: FLIP_CARD_SVG },
      // toggleIsOpen() must inspect each card in the selection and split them
      // into "open" and "closed" groups, then emit separate operations for
      // each group. Cannot be setProperty because the value written to each
      // card depends on reading its own current state.
      methodName: "toggleIsOpen",
    },
    {
      kind: "custom",
      tooltip: "Rotate 90° counter-clockwise",
      button: { kind: "icon", svg: ROTATE_CCW_SVG },
      // rotate() applies a relative rotation delta — not a property absolute set.
      methodName: "rotate",
    },
    {
      kind: "custom",
      tooltip: "Rotate 90° clockwise",
      button: { kind: "icon", svg: ROTATE_CW_SVG },
      methodName: "rotate",
    },
  ],

  contextMenu: [
    {
      kind: "custom",
      tooltip: "Flip card",
      button: { kind: "icon", svg: FLIP_CARD_SVG },
      methodName: "toggleIsOpen",
    },
  ],

  // Card has no tool panel button — cards are added by Deck or imported
  // as images; there is no dedicated "Add Card" placement tool.
};
