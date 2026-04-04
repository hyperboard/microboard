import type { ItemActionConfig } from "Items/ItemActions";

const SHUFFLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 3 21 3 21 8"/>
  <line x1="4" y1="20" x2="21" y2="3"/>
  <polyline points="21 16 21 21 16 21"/>
  <line x1="15" y1="15" x2="21" y2="21"/>
  <line x1="4" y1="4" x2="9" y2="9"/>
</svg>`;

const FLIP_DECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="2" y="6" width="14" height="10" rx="1"/>
  <rect x="6" y="3" width="14" height="10" rx="1"/>
  <polyline points="18 11 22 7 18 3"/>
  <line x1="22" y1="7" x2="14" y2="7"/>
</svg>`;

const GET_TOP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="8" width="14" height="10" rx="1"/>
  <rect x="5" y="5" width="14" height="10" rx="1"/>
  <line x1="12" y1="2" x2="12" y2="8"/>
  <polyline points="9 5 12 2 15 5"/>
</svg>`;

const GET_BOTTOM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="6" width="14" height="10" rx="1"/>
  <rect x="5" y="3" width="14" height="10" rx="1"/>
  <line x1="12" y1="16" x2="12" y2="22"/>
  <polyline points="9 19 12 22 15 19"/>
</svg>`;

const GET_RANDOM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="6" width="14" height="10" rx="1"/>
  <rect x="5" y="3" width="14" height="10" rx="1"/>
  <circle cx="20" cy="5" r="2" fill="currentColor"/>
  <circle cx="20" cy="12" r="2" fill="currentColor"/>
  <circle cx="20" cy="19" r="2" fill="currentColor"/>
</svg>`;

export const deckActions: ItemActionConfig = {
  contextPanel: [
    {
      kind: "custom",
      tooltip: "Get top card",
      button: { kind: "icon", svg: GET_TOP_SVG },
      // getTopCard() removes the top child Card from the Deck container and
      // places it on the board at a computed position. This mutates the
      // container's child list and involves spatial coordinate math — cannot
      // be setProperty.
      methodName: "getTopCard",
    },
    {
      kind: "custom",
      tooltip: "Get bottom card",
      button: { kind: "icon", svg: GET_BOTTOM_SVG },
      // Same as getTopCard but from the opposite end.
      methodName: "getBottomCard",
    },
    {
      kind: "custom",
      tooltip: "Get random card",
      button: { kind: "icon", svg: GET_RANDOM_SVG },
      // Same as getTopCard but picks a random child.
      methodName: "getRandomCard",
    },
    {
      kind: "custom",
      tooltip: "Shuffle deck",
      button: { kind: "icon", svg: SHUFFLE_SVG },
      // shuffleDeck() randomly reorders all children within the container and
      // triggers a visual shuffle animation — this is a multi-step child
      // management operation, not a property mutation.
      methodName: "shuffleDeck",
    },
    {
      kind: "custom",
      tooltip: "Flip deck",
      button: { kind: "icon", svg: FLIP_DECK_SVG },
      // flipDeck() simultaneously reverses the child insertion order AND
      // toggles the face/back state of all contained cards. Two interdependent
      // mutations that cannot be expressed as a single setProperty call.
      methodName: "flipDeck",
    },
  ],

  contextMenu: [
    {
      kind: "custom",
      tooltip: "Shuffle deck",
      button: { kind: "icon", svg: SHUFFLE_SVG },
      methodName: "shuffleDeck",
    },
    {
      kind: "custom",
      tooltip: "Flip deck",
      button: { kind: "icon", svg: FLIP_DECK_SVG },
      methodName: "flipDeck",
    },
    {
      kind: "custom",
      tooltip: "Get top card",
      button: { kind: "icon", svg: GET_TOP_SVG },
      methodName: "getTopCard",
    },
    {
      kind: "custom",
      tooltip: "Get random card",
      button: { kind: "icon", svg: GET_RANDOM_SVG },
      methodName: "getRandomCard",
    },
  ],

  // Deck has no dedicated tool panel button — decks are created from
  // a selection of Cards (via the createDeck hotkey / context action).
};
