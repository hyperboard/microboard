import type {
  ItemOverlayDefinition,
  OverlayDynamicOptionsContext,
  OverlayOptionDefinition,
  SelectionOverlayActionDefinition,
} from "Overlay";
import { overlayAssetIcon, registerDynamicOptionsResolver } from "Overlay";

registerDynamicOptionsResolver("deck.drawCount", (context: OverlayDynamicOptionsContext): OverlayOptionDefinition[] => {
  const deck = context.item && context.item.itemType === "Deck"
    ? (context.item as unknown as { getDeck(): unknown[] })
    : undefined;
  const max = Math.min(deck?.getDeck().length ?? 0, 10);
  return Array.from({ length: max }, (_, index) => ({
    id: `${index + 1}`,
    label: `${index + 1}`,
    value: index + 1,
  }));
});

export const deckOverlay: ItemOverlayDefinition = {
  itemType: "Deck",
  actions: [
    {
      id: "deck.getTopCard",
      label: "Draw top card",
      icon: overlayAssetIcon("src/Items/Deck/icons/DrawTop.icon.svg"),
      target: "single",
      invoke: { kind: "customMethod", methodName: "getTopCard" },
    },
    {
      id: "deck.getBottomCard",
      label: "Draw bottom card",
      icon: overlayAssetIcon("src/Items/Deck/icons/DrawBottom.icon.svg"),
      target: "single",
      invoke: { kind: "customMethod", methodName: "getBottomCard" },
    },
    {
      id: "deck.getRandomCard",
      label: "Draw random card",
      icon: overlayAssetIcon("src/Items/Deck/icons/DrawRandom.icon.svg"),
      target: "single",
      invoke: { kind: "customMethod", methodName: "getRandomCard" },
    },
    {
      id: "deck.getCards",
      label: "Draw cards",
      icon: overlayAssetIcon("src/Items/Deck/icons/DrawMany.icon.svg"),
      target: "single",
      controls: [
        {
          id: "count",
          label: "Count",
          editor: {
            kind: "dynamic-options",
            providerId: "deck.drawCount",
            presentation: "list",
          },
        },
      ],
      invoke: {
        kind: "customMethod",
        methodName: "getCards",
        args: [{ kind: "control", controlId: "count" }],
      },
    },
    {
      id: "deck.shuffle",
      label: "Shuffle",
      icon: overlayAssetIcon("src/Items/Deck/icons/Shuffle.icon.svg"),
      target: "single",
      invoke: { kind: "customMethod", methodName: "shuffleDeck" },
    },
    {
      id: "deck.flip",
      label: "Flip deck",
      icon: overlayAssetIcon("src/Items/Deck/icons/Flip.icon.svg"),
      target: "single",
      invoke: { kind: "customMethod", methodName: "flipDeck" },
    },
  ],
};

export const createDeckSelectionAction: SelectionOverlayActionDefinition = {
  id: "deck.createFromSelection",
  label: "Create deck",
  icon: overlayAssetIcon("src/Items/Deck/icons/CreateFromSelection.icon.svg"),
  description: "Stacks selected cards into a new deck, or merges selected cards and decks into one deck.",
  invoke: { kind: "selectionMethod", methodName: "createDeck" },
  isAvailable: items => {
    if (items.length === 0) {
      return false;
    }

    if (items.length === 1 && items[0]?.itemType === "Deck") {
      return false;
    }

    return items.every(item => item.itemType === "Card" || item.itemType === "Deck")
      && items.some(item => item.itemType === "Card" || item.itemType === "Deck");
  },
};
