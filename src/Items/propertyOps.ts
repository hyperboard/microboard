import { SetPropertyOperation } from "../Events/EventsOperations";

type ItemLike = { getId(): string };
export type ItemOrId = ItemLike | string;

export function idsOf(items: readonly ItemOrId[]): string[] {
    return items.map((item) => (typeof item === "string" ? item : item.getId()));
}

export const propertyOps = {
    setProperty(items: readonly ItemLike[], property: string, value: unknown): SetPropertyOperation {
        return {
            class: "Item",
            method: "setProperty",
            item: items.map(i => i.getId()),
            property,
            value,
            prevValues: items.map(i => (i as any)[property]),
        };
    }
};
