import { Item, Frame } from "Board/Items";
import { DrawingContext } from "Board/Items/DrawingContext";
import { Tool } from "Board/Tools/Tool";

export class NestingHighlighter extends Tool {
  private toHighlight: Item[] = [];
  constructor(items?: Item[]) {
    super();
    if (items) {
      this.add(items);
    }
  }

  clear(): void {
    this.toHighlight = [];
  }

  listAll(): Item[] {
      return this.toHighlight;
  }

  add(item: Item | Item[]): void {
    if (Array.isArray(item)) {
      this.toHighlight.push(...item.filter((currItem) => !this.toHighlight.includes(currItem)));
    } else {
      if (!this.toHighlight.includes(item)) {
        this.toHighlight.push(item);
      }
    }
  }
  
  remove(item: Item | Item[]): void {
    if (Array.isArray(item)) {
      this.toHighlight = this.toHighlight
        .filter((toHighlightItem) => !item.includes(toHighlightItem))
    } else {
      this.toHighlight = this.toHighlight
        .filter((toHighlightItem) => toHighlightItem !== item);
    }
  }

  set(item: Item | Item[]): void {
    this.toHighlight = Array.isArray(item) ? item : [item];
  }

  render(context: DrawingContext): void {
    if (this.toHighlight.length > 0) {
      this.toHighlight.forEach((toDraw) => {
          const rect = toDraw.getMbr();
          if (toDraw instanceof Frame) {
              rect.borderColor = "blue";
              rect.strokeWidth = 1;
          } else {
              rect.backgroundColor = "rgb(128, 128, 128, 0.5)";
          }
          rect.render(context);
      })
  }
  }
}