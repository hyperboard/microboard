import { BoardEvent, SyncBoardEvent } from "../Events";
import { mergeOperations } from "../Merge";
import { mergeRecords } from "../mergeRecords";
import { SyncLog, SyncLogSubject, createSyncLog, SyncLogMsg } from "../SyncLog";
import { transformEvents } from "../transformEvents";
import { HistoryRecord } from "./EventsLog";
import { Operation } from "../EventsOperations";
import { Command } from "../Command";
import { BoardOps } from "BoardOperations";
import { Subject } from "../../Subject";

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
  confirmSentRecordIds(eventIds: string[]): void;
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

  function getOpItems(op: Operation): string[] {
      if ("item" in op) {
          const item = (op as { item: unknown }).item;
          if (Array.isArray(item)) return item as string[];
          if (typeof item === "string") return [item];
          if (item && typeof item === "object") return Object.keys(item);
      }
      if ("itemsMap" in op && op.itemsMap) return Object.keys(op.itemsMap);
      if ("items" in op) {
          const items = (op as { items: unknown }).items;
          if (Array.isArray(items)) {
              return items
                  .map((i: unknown) => (typeof i === "string" ? i : (i as { id: string }).id))
                  .filter(Boolean);
          }
          if (items && typeof items === "object" && items !== null) return Object.keys(items);
      }
      if ("itemsOps" in op) {
          const itemsOps = (op as { itemsOps: unknown[] }).itemsOps;
          return itemsOps.map((io) => (io as { item: string }).item);
      }
      return [];
  }

  return {
    commandFactory,
    addConfirmedRecords(records: HistoryRecord[]) {
      confirmedRecords.push(...records);
      syncLog.push({ msg: "confirmed", records } as SyncLogMsg);
    },
    addNewRecords(records: HistoryRecord[]) {
      newRecords.push(...records);
      syncLog.push({ msg: "addedNew", records } as SyncLogMsg);
    },
    confirmSentRecords(events: BoardEvent[]) {
      for (const event of events) {
        const index = recordsToSend.findIndex(
          (r) => r.event.body.eventId === event.body.eventId
        );
        if (index !== -1) {
          const [record] = recordsToSend.splice(index, 1);
          confirmedRecords.push(record);
          syncLog.push({ msg: "confirmed", records: [record] } as SyncLogMsg);
        }
      }
    },
    confirmSentRecordIds(eventIds: string[]) {
      for (const eventId of eventIds) {
        const index = recordsToSend.findIndex(
          (record) => record.event.body.eventId === eventId
        );
        if (index === -1) {
          continue;
        }
        const [record] = recordsToSend.splice(index, 1);
        confirmedRecords.push(record);
        syncLog.push({ msg: "confirmed", records: [record] } as SyncLogMsg);
      }
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
      const records = [...newRecords];
      recordsToSend.push(...records);
      newRecords.length = 0;
      syncLog.push({ msg: "toSend", records } as SyncLogMsg);
      return records;
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
      const unconfirmed = [...recordsToSend, ...newRecords].filter(
        predicate || (() => true)
      );
      for (const record of unconfirmed) {
        record.command.apply();
      }
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
        const itemIdSet = new Set(itemIds);
        const filter = (record: HistoryRecord) => {
            const opItems = getOpItems(record.event.body.operation);
            return !opItems.some(id => itemIdSet.has(id));
        };
        
        const filteredNewRecords = newRecords.filter(filter);
        newRecords.length = 0;
        newRecords.push(...filteredNewRecords);
        
        const filteredRecordsToSend = recordsToSend.filter(filter);
        recordsToSend.length = 0;
        recordsToSend.push(...filteredRecordsToSend);
        
        syncLog.length = 0;
        syncLog.push({ msg: "confirmed", records: confirmedRecords } as SyncLogMsg);
        syncLog.push({ msg: "toSend", records: recordsToSend } as SyncLogMsg);
        syncLog.push({ msg: "addedNew", records: newRecords } as SyncLogMsg);
        syncLogSubject.publish(syncLog);
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
