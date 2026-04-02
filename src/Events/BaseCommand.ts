import type { Board } from "Board";
import { BaseOperation, Operation, isItemOp, SetPropertyOperation } from "./EventsOperations";
import { Command } from "./Command";

export class BaseCommand implements Command {
  private reverse: { itemId: string; operation: Operation }[];

  constructor(
    private board: Board,
    public itemIds: string[],
    public operation: Operation
  ) {
    this.reverse = this.getReverse();
  }

  merge(op: Operation): this {
    if (isItemOp(op)) {
      this.operation = op;
    }
    return this;
  }

  apply(): void {
    for (const itemId of this.itemIds) {
      const item = this.board.items.getById(itemId);
      if (!item) {
        continue;
      }
      item.apply(this.operation);
    }
  }

  revert(): void {
    for (const { itemId, operation } of this.reverse) {
      const item = this.board.items.getById(itemId);
      if (!item) {
        continue;
      }
      item.apply(operation);
    }
  }

  getReverse(): { itemId: string; operation: Operation }[] {
    switch (this.operation.method) {
      case "addChildren":
        return this.itemIds.map((itemId) => {
          return {
            itemId,
            operation: {
              ...this.operation,
              method: "removeChildren",
            } as Operation,
          };
        });
      case "removeChildren":
        return this.itemIds.map((itemId) => {
          return {
            itemId,
            operation: {
              ...this.operation,
              method: "addChildren",
            } as Operation,
          };
        });
      case "setProperty":
        return this.itemIds.map((itemId) => {
          const op = this.operation as SetPropertyOperation;
          const idx = op.item.indexOf(itemId);
          return {
            itemId,
            operation: {
              ...op,
              item: [itemId],
              value: idx !== -1 ? op.prevValues[idx] : op.value,
              prevValues: [op.value],
            } as Operation,
          };
        });
      default:
        return this.itemIds.map((itemId) => {
          const op = this.operation as BaseOperation;
          let newData: Record<string, any> = {};
          if (op.prevData) {
            newData = { ...op.prevData };
          } else if (op.newData) {
            const item = this.board.items.getById(itemId);
            if (item) {
              Object.keys(op.newData).forEach((key) => {
                // @ts-ignore
                if (item[key] !== undefined) {
                  // @ts-ignore
                  newData[key] = item[key];
                }
              });
            }
          }
          return {
            itemId,
            operation: {
              ...op,
              newData,
            } as Operation,
          };
        });
    }
  }
}
