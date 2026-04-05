import type { ItemOverlayDefinition, OverlayDynamicOptionsContext, OverlayOptionDefinition } from "Overlay";
import { registerDynamicOptionsResolver } from "Overlay";

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
      icon: { kind: "symbol", key: "deck.drawTop" },
      target: "single",
      invoke: { kind: "customMethod", methodName: "getTopCard" },
    },
    {
      id: "deck.getBottomCard",
      label: "Draw bottom card",
      icon: { kind: "symbol", key: "deck.drawBottom" },
      target: "single",
      invoke: { kind: "customMethod", methodName: "getBottomCard" },
    },
    {
      id: "deck.getRandomCard",
      label: "Draw random card",
      icon: { kind: "symbol", key: "deck.drawRandom" },
      target: "single",
      invoke: { kind: "customMethod", methodName: "getRandomCard" },
    },
    {
      id: "deck.getCards",
      label: "Draw cards",
      icon: { kind: "symbol", key: "deck.drawMany" },
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
      icon: { kind: "symbol", key: "deck.shuffle" },
      target: "single",
      invoke: { kind: "customMethod", methodName: "shuffleDeck" },
    },
    {
      id: "deck.flip",
      label: "Flip deck",
      icon: { kind: "symbol", key: "deck.flip" },
      target: "single",
      invoke: { kind: "customMethod", methodName: "flipDeck" },
    },
  ],
};
