import { BoardEvent } from "../Events";
import { mergeOperations } from "../Merge";
import { mergeRecords } from "../mergeRecords";
import { SyncLog, SyncLogSubject, createSyncLog, SyncLogMsg } from "../SyncLog";
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
  commandFactory: (ops: Operation) => Command;
  addConfirmedRecords(records: HistoryRecord[]): void;
  addNewRecords(records: HistoryRecord[]): void;
  confirmSentRecords(records: BoardEvent[]): void;
  confirmSentRecordIds(eventIds: string[], order: number): void;
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
  commandFactory: (ops: Operation) => Command
): EventsList {
  const confirmedRecords: HistoryRecord[] = [];
  const recordsToSend: HistoryRecord[] = [];
  const newRecords: HistoryRecord[] = [];
  const justConfirmed: HistoryRecord[] = [];
  const { log: syncLog, subject: syncLogSubject } = createSyncLog();

  let snapshotLastIndex = 0;

  function revert(records: HistoryRecord[]): void {
    for (let i = records.length - 1; i >= 0; i--) {
      records[i].command.revert();
    }
  }

  function apply(records: HistoryRecord[]): void {
    for (const record of records) {
      record.command = commandFactory(record.event.body.operation);
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
    commandFactory,
    addConfirmedRecords(records: HistoryRecord[]) {
      syncLog.push({ msg: "confirmed", records } as SyncLogMsg);
      mergeAndPushConfirmedRecords(records);
    },
    addNewRecords(records: HistoryRecord[]) {
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
            lastRecord.command = commandFactory(mergedOperation);
            continue;
          }
        }

        newRecords.push(record);
        syncLog.push({ msg: "addedNew", records: [record] } as SyncLogMsg);
      }
    },
    confirmSentRecords(events: BoardEvent[]) {
      const records = recordsToSend;
      if (records.length !== events.length) {
        console.error("Mismatch between records and events length");
        return;
      }

      for (let i = 0; i < records.length; i++) {
        records[i].event.order = events[i].order;
      }

      syncLog.push({ msg: "confirmed", records: [...records] } as SyncLogMsg);
      mergeAndPushConfirmedRecords(records);
      recordsToSend.splice(0, records.length);
    },
    confirmSentRecordIds(eventIds: string[], order: number) {
      const confirmedRecordsById: HistoryRecord[] = [];
      for (const eventId of eventIds) {
        const index = recordsToSend.findIndex(
          (record) => record.event.body.eventId === eventId
        );
        if (index === -1) {
          continue;
        }
        const [record] = recordsToSend.splice(index, 1);
        record.event.order = order;
        confirmedRecordsById.push(record);
      }

      if (confirmedRecordsById.length === 0) {
        return;
      }

      syncLog.push({ msg: "confirmed", records: confirmedRecordsById } as SyncLogMsg);
      mergeAndPushConfirmedRecords(confirmedRecordsById);
    },
    getConfirmedRecords() {
      return confirmedRecords;
    },
    getRecordsToSend() {
      return recordsToSend;
    },
    getNewRecords() {
      return newRecords;
    },
    getAllRecords() {
      return [...confirmedRecords, ...recordsToSend, ...newRecords];
    },
    prepareRecordsToSend() {
      if (recordsToSend.length === 0 && newRecords.length > 0) {
        const records = [...newRecords];
        recordsToSend.push(...records);
        newRecords.length = 0;
        syncLog.push({ msg: "toSend", records } as SyncLogMsg);
      }
      return recordsToSend;
    },
    forwardIterable() {
      return (function* () {
        yield* confirmedRecords;
        yield* recordsToSend;
        yield* newRecords;
      })();
    },
    backwardIterable() {
      return (function* () {
        for (let i = newRecords.length - 1; i >= 0; i--) yield newRecords[i];
        for (let i = recordsToSend.length - 1; i >= 0; i--) yield recordsToSend[i];
        for (let i = confirmedRecords.length - 1; i >= 0; i--)
          yield confirmedRecords[i];
      })();
    },
    revertUnconfirmed(predicate?: FilterPredicate) {
      const toRevert = [...recordsToSend, ...newRecords].filter(
        predicate || (() => true)
      );
      revert(toRevert);
      syncLog.push({ msg: "revertUnconfirmed", records: toRevert } as SyncLogMsg);
    },
    applyUnconfirmed(predicate?: FilterPredicate) {
      const filter = predicate || (() => true);

      if (justConfirmed.length > 0) {
        const confirmedEvents = justConfirmed.map((record) => record.event);
        const transformedSend = transformEvents(
          confirmedEvents,
          recordsToSend.map((record) => record.event)
        );
        const transformedNew = transformEvents(
          confirmedEvents,
          newRecords.map((record) => record.event)
        );

        const updatedRecordsToSend = transformedSend.map((event) => ({
          event,
          command: commandFactory(event.body.operation),
        }));
        const updatedNewRecords = transformedNew.map((event) => ({
          event,
          command: commandFactory(event.body.operation),
        }));

        recordsToSend.length = 0;
        recordsToSend.push(...updatedRecordsToSend);
        newRecords.length = 0;
        newRecords.push(...updatedNewRecords);
        justConfirmed.length = 0;
      }

      const unconfirmed = [...recordsToSend, ...newRecords].filter(filter);
      apply(unconfirmed);
      syncLog.push({ msg: "applyUnconfirmed", records: unconfirmed } as SyncLogMsg);
    },
    justConfirmed,
    getSyncLog() {
      return syncLog;
    },
    syncLogSubject,
    clear() {
      confirmedRecords.length = 0;
      recordsToSend.length = 0;
      newRecords.length = 0;
      syncLog.length = 0;
      syncLogSubject.publish(syncLog);
    },
    clearConfirmedRecords() {
      confirmedRecords.length = 0;
      syncLog.length = 0;
      syncLogSubject.publish(syncLog);
    },
    removeUnconfirmedEventsByItems(itemIds: string[]) {
      function shouldRemoveEvent(operation: Operation, ids: string[]): boolean {
        if (operation.method === "add" && operation.class === "Board") {
          if (Array.isArray(operation.item)) {
            return operation.item.some((id) => ids.includes(id));
          }
          return ids.includes(operation.item);
        }

        if (operation.method === "remove" && operation.class === "Board") {
          return operation.item.some((id) => ids.includes(id));
        }

        return false;
      }

      const nextRecordsToSend = recordsToSend.filter(
        (record) => !shouldRemoveEvent(record.event.body.operation, itemIds)
      );
      if (nextRecordsToSend.length !== recordsToSend.length) {
        recordsToSend.length = 0;
        recordsToSend.push(...nextRecordsToSend);
      }

      const nextNewRecords = newRecords.filter(
        (record) => !shouldRemoveEvent(record.event.body.operation, itemIds)
      );
      if (nextNewRecords.length !== newRecords.length) {
        newRecords.length = 0;
        newRecords.push(...nextNewRecords);
      }
    },
    isAllEventsConfirmed() {
      return recordsToSend.length === 0 && newRecords.length === 0;
    },
    setSnapshotLastIndex(index: number) {
      snapshotLastIndex = index;
    },
    getSnapshotLastIndex() {
      return snapshotLastIndex;
    },
  };
}
