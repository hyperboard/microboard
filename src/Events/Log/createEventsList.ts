import { BoardEvent } from "../Events";
import { mergeOperations } from "../Merge";
import { mergeRecords } from "../mergeRecords";
import { SyncLog, SyncLogSubject, createSyncLog } from "../SyncLog";
import { transformEvents } from "../transformEvents";
import { HistoryRecord } from "./EventsLog";
import { Operation } from "../EventsOperations";
import { Command } from "../Command";

export type FilterPredicate = (
  value: HistoryRecord,
  index: number,
  array: HistoryRecord[]
) => boolean;

export interface EventsList {
  addConfirmedRecords(records: HistoryRecord[]): void;
  addNewRecords(records: HistoryRecord[]): void;
  confirmSentRecords(records: BoardEvent[]): void;
  getConfirmedRecords(): HistoryRecord[];
  getRecordsToSend(): HistoryRecord[];
  getNewRecords(): HistoryRecord[];
  getAllRecords(): HistoryRecord[];
  prepareRecordsToSend(): HistoryRecord[];
  forwardIterable(): Iterable<HistoryRecord>;
  backwardIterable(): Iterable<HistoryRecord>;
  /** Reverts all unconfirmed events (records to send and new records) in reverse order
   * @argument filter - function that filters records to revert*/
  revertUnconfirmed(predicate?: FilterPredicate): void;
  /** Applies all unconfirmed events, transforming them if necessary
   * @argument filter - function that filters records to apply*/
  applyUnconfirmed(predicate?: FilterPredicate): void;
  justConfirmed: HistoryRecord[];
  // Retrieves the synchronization log for tracking event changes
  getSyncLog(): SyncLog;
  // Subject for synchronization log events, allowing subscription to log changes
  syncLogSubject: SyncLogSubject;
  // Completely clears all records from the events log
  clear(): void;
  // Clears only the confirmed records from the events log
  clearConfirmedRecords(): void;
  removeUnconfirmedEventsByItems(itemIds: string[]): void;
  isAllEventsConfirmed(): boolean;
  /**
   * Sets the last known index for snapshots
   */
  setSnapshotLastIndex(index: number): void;
  getSnapshotLastIndex(): number;
}

export function createEventsList(
  createCommand: (BoardOps) => Command
): EventsList {
  const confirmedRecords: HistoryRecord[] = [];
  const recordsToSend: HistoryRecord[] = [];
  const newRecords: HistoryRecord[] = [];
  const justConfirmed: HistoryRecord[] = [];
  const { log: syncLog, subject: syncLogSubject } = createSyncLog();
  let snapshotLastIndex = 0;

  function revert(records: HistoryRecord[]): void {
    for (const record of records) {
      record.command.revert();
    }
  }

  function apply(records: HistoryRecord[]): void {
    for (const record of records) {
      record.command = createCommand(record.event.body.operation);
      record.command.apply();
    }
  }

  function mergeAndPushConfirmedRecords(records: HistoryRecord[]): void {
    const lastConfirmedRecord = confirmedRecords.pop();
    const recordsToMerge = lastConfirmedRecord
      ? [lastConfirmedRecord, ...records]
      : records;
    const mergedRecords = mergeRecords(recordsToMerge);
    confirmedRecords.push(...mergedRecords);
  }
  return {
    isAllEventsConfirmed(): boolean {
      return newRecords.length === 0 && recordsToSend.length === 0;
    },

    addConfirmedRecords(records: HistoryRecord[]): void {
      syncLog.push({
        msg: "confirmed",
        records: [...records],
      });
      mergeAndPushConfirmedRecords(records);
      // confirmedRecords.push(...records);
    },

    addNewRecords(records: HistoryRecord[]): void {
      for (const record of records) {
        if (newRecords.length > 0) {
          const lastRecord = newRecords[newRecords.length - 1];
          const mergedOperation = mergeOperations(
            lastRecord.event.body.operation,
            record.event.body.operation
          );

          if (mergedOperation) {
            lastRecord.event = {
              ...lastRecord.event,
              body: {
                ...lastRecord.event.body,
                operation: mergedOperation,
              },
            };
            lastRecord.command = createCommand(mergedOperation);
            continue;
          }
        }

        syncLog.push({
          msg: "addedNew",
          records: [record],
        });
        newRecords.push(record);
      }
    },

    confirmSentRecords(events: BoardEvent[]): void {
      const records = recordsToSend;
      if (records.length !== events.length) {
        console.error("Mismatch between records and events length");
        return;
      }

      for (let i = 0; i < records.length; i++) {
        records[i].event.order = events[i].order;
      }

      syncLog.push({
        msg: "confirmed",
        records: [...records],
      });
      mergeAndPushConfirmedRecords(records);
      recordsToSend.splice(0, records.length);
    },

    getConfirmedRecords(): HistoryRecord[] {
      return confirmedRecords;
    },

    getRecordsToSend(): HistoryRecord[] {
      return recordsToSend;
    },

    getNewRecords(): HistoryRecord[] {
      return newRecords;
    },

    getAllRecords(): HistoryRecord[] {
      return [...confirmedRecords, ...recordsToSend, ...newRecords];
    },

    getSyncLog(): SyncLog {
      return syncLog;
    },

    syncLogSubject,
    justConfirmed,

    prepareRecordsToSend(): HistoryRecord[] {
      if (recordsToSend.length === 0 && newRecords.length > 0) {
        syncLog.push({
          msg: "toSend",
          records: [...newRecords],
        });
        recordsToSend.push(...newRecords);
        newRecords.length = 0;
      }
      return recordsToSend;
    },

    forwardIterable(): Iterable<HistoryRecord> {
      return {
        [Symbol.iterator]: function* () {
          yield* confirmedRecords;
          yield* recordsToSend;
          yield* newRecords;
        },
      };
    },

    backwardIterable(): Iterable<HistoryRecord> {
      return {
        [Symbol.iterator]: function* () {
          yield* newRecords.slice().reverse();
          yield* recordsToSend.slice().reverse();
          yield* confirmedRecords.slice().reverse();
        },
      };
    },

    revertUnconfirmed(predicate?: FilterPredicate): void {
      predicate = predicate ? predicate : () => true;

      // do not .reverse original array, slice if no .filter
      revert(newRecords.filter(predicate).reverse());
      revert(recordsToSend.filter(predicate).reverse());
      syncLog.push({
        msg: "revertUnconfirmed",
        records: [...recordsToSend, ...newRecords],
      });
    },

    applyUnconfirmed(predicate?: FilterPredicate): void {
      predicate = predicate ? predicate : () => true;

      if (justConfirmed.length > 0) {
        const transformedSend = transformEvents(
          justConfirmed.map((rec) => rec.event),
          recordsToSend.slice().map((rec) => rec.event)
        );

        const transformedNew = transformEvents(
          justConfirmed.map((rec) => rec.event),
          newRecords.slice().map((rec) => rec.event)
        );

        const recsToSend = transformedSend.map((event) => ({
          event,
          command: createCommand(event.body.operation),
        }));

        const recsNew = transformedNew.map((event) => ({
          event,
          command: createCommand(event.body.operation),
        }));

        recordsToSend.length = 0;
        recordsToSend.push(...recsToSend);
        newRecords.length = 0;
        newRecords.push(...recsNew);
        justConfirmed.length = 0;
      }
      apply(recordsToSend.filter(predicate));
      apply(newRecords.filter(predicate));
      syncLog.push({
        msg: "applyUnconfirmed",
        records: [...recordsToSend, ...newRecords],
      });
    },

    clear(): void {
      confirmedRecords.length = 0;
      recordsToSend.length = 0;
      newRecords.length = 0;
    },
    clearConfirmedRecords(): void {
      confirmedRecords.length = 0;
    },

    // FIXME: should filter unconfirmed events and not send them
    removeUnconfirmedEventsByItems(itemIds: string[]): void {
      function shouldRemoveEvent(
        operation: Operation,
        itemIds: string[]
      ): boolean {
        if (operation.method === "add" && operation.class === "Board") {
          if (Array.isArray(operation.item)) {
            return operation.item.some((id) => itemIds.includes(id));
          }
          return itemIds.includes(operation.item);
        }

        if (operation.method === "remove" && operation.class === "Board") {
          return operation.item.some((id) => itemIds.includes(id));
        }

        return false;
      }
      const removedFromToSend = recordsToSend.filter((record) =>
        shouldRemoveEvent(record.event.body.operation, itemIds)
      );
      if (removedFromToSend.length > 0) {
        const newRecordsToSend = recordsToSend.filter(
          (record) => !shouldRemoveEvent(record.event.body.operation, itemIds)
        );
        recordsToSend.length = 0;
        recordsToSend.push(...newRecordsToSend);
      }

      const removedFromNew = newRecords.filter((record) =>
        shouldRemoveEvent(record.event.body.operation, itemIds)
      );
      if (removedFromNew.length > 0) {
        const newRecordsArray = newRecords.filter(
          (record) => !shouldRemoveEvent(record.event.body.operation, itemIds)
        );
        newRecords.length = 0;
        newRecords.push(...newRecordsArray);
      }
    },
    getSnapshotLastIndex: (): number => {
      return snapshotLastIndex;
    },
    setSnapshotLastIndex: (index: number): void => {
      snapshotLastIndex = index;
    },
  };
}
