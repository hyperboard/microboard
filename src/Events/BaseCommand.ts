import type { Board } from "Board";
import { BaseOperation, Operation, isItemOp } from "./EventsOperations";
import { Command } from "./Command";

export class BaseCommand implements Command {
  private reverse: { itemId: string; operation: BaseOperation }[];

  constructor(
    private board: Board,
    public itemIds: string[],
    public operation: BaseOperation
  ) {
    this.reverse = this.getReverse();
  }

  merge(op: Operation): this {
    if (isItemOp(op)) {
      this.operation = op as BaseOperation;
    }
    return this;
  }

  apply(): void {
    for (const itemId of this.itemIds) {
      const item = this.board.items.getById(itemId);
      if (!item) {
        continue;
      }
      item.apply(this.operation as Operation);
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

  getReverse(): { itemId: string; operation: BaseOperation }[] {
    switch (this.operation.method) {
      case "addChildren":
        return this.itemIds.map((itemId) => {
          return {
            itemId,
            operation: {
              ...this.operation,
              method: "removeChildren",
            },
          };
        });
      case "removeChildren":
        return this.itemIds.map((itemId) => {
          return {
            itemId,
            operation: {
              ...this.operation,
              method: "addChildren",
            },
          };
        });
      default:
        return this.itemIds.map((itemId) => {
          const op = this.operation;
          let newData: Record<string, any> = {};
          if (op.prevData) {
            newData = { ...op.prevData };
          } else {
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
            },
          };
        });
    }
  }
}
