import { Board } from "Board/Board";
import { Command, createCommand } from "./Command";
import { BoardEvent, Events } from "./Events";
import { mergeOperations, canNotBeMerged } from "./Merge";

export interface HistoryRecord {
    event: BoardEvent;
    command: Command;
}

export class EventsLog {
    readonly list: HistoryRecord[] = [];
    last = 0;

    constructor(private board: Board, private events: Events) { }

    push(record: HistoryRecord): HistoryRecord {
        const last = this.list.pop();
        if (!last) {
            this.list.push(record);
            return record;
        }
        const merge = mergeOperations(
            last.event.body.operation,
            record.event.body.operation,
        );
        if (!merge) {
            this.list.push(last);
            this.list.push(record);
            return record;
        }
        const mergedEvent = {
            ...record.event,
            body: {
                ...record.event.body,
                operation: merge,
            },
        };
        const command = createCommand(
            this.events,
            this.board,
            mergedEvent.body.operation,
        );
        // TODO API Dirty Check
        if (record.event.body.operation.class === "Connector") {
            command.reverse = last.command.reverse;
        }
        const mergedRecord = {
            event: mergedEvent,
            command,
        };
        this.list.push(mergedRecord);
        return mergedRecord;
    }

    /*
    new single record: 
        apply record,
        pop previous,
        attempt to merge with previous,
        push to the log both (merged or separate)
    new array of records:
        walk over the array attempting to merge the records
        apply the new array
        push the new array
    */
    mergeEvents(events: BoardEvent[]): BoardEvent[] {
        if (events.length < 2) {
            return events;
        }
        const mergedEvents = [];
        let previous;
        for (const event of events) {
            if (!previous) {
                previous = event;
                continue;
            }
            const mergedOperation = mergeOperations(
                previous.body.operation,
                event.body.operation,
            );
            if (!mergedOperation) {
                mergedEvents.push(previous);
                previous = event;
                continue;
            }
            const mergedEvent = {
                ...event,
                body: {
                    ...event.body,
                    operation: mergedOperation,
                },
            };
            previous = mergedEvent;
        }
        mergedEvents.push(previous);
        return mergedEvents;
    }

    /** Pop records that have no order
     *  from the top of the log stack
     *  on to a new stack and return the new stack */
    popUnorderedRecords(): HistoryRecord[] {
        const records = [];
        for (let i = this.list.length - 1; i >= 0; i--) {
            const record = this.list[i];
            if (record.event.order) {
                break;
            } else {
                this.list.pop();
                record.command.revert();
                records.push(record);
            }
        }
        return records;
    }

    /** Pop records that have no order
     *  from the top of the log stack
     *  on to a new stack and return the new stack */
    popUnorderedRecordsWithoutRevert(): HistoryRecord[] {
        const records = [];
        for (let i = this.list.length - 1; i >= 0; i--) {
            const record = this.list[i];
            if (record.event.order) {
                break;
            } else {
                this.list.pop();
                records.push(record);
            }
        }
        return records;
    }

    /** Pop records from the argument stack
     *  and push them to the log stack */
    pushRecordsStack(records: HistoryRecord[]): void {
        for (let i = records.length - 1; i >= 0; i--) {
            const record = records[i];
            record.command.apply();
            this.list.push(record);
        }
    }

    pushRecordsStackWithoutApply(records: HistoryRecord[]): void {
        for (let i = records.length - 1; i >= 0; i--) {
            const record = records[i];
            this.list.push(record);
        }
    }

    /** Pop records from the argument stack
     *  and push them to the log stack */
    pushRecordsStackAndRecreateCommands(
        records: HistoryRecord[],
        createCommand: (op: Operation) => Command,
    ): void {
        for (let i = records.length - 1; i >= 0; i--) {
            const record = records[i];
            record.command = createCommand(record.event.body.operation);
            record.command.apply();
            this.list.push(record);
        }
    }

    /**
     * Returns the most recent history record that can be undone for a given user.
     * @param userId - The id of the user.
     * @returns The history record, or null if no such record is found.
     */
    getUserUndoRecord(userId: number): HistoryRecord | null {
        // Initialize a counter to track the number of "undo" actions performed by the user.
        let counter = 0;

        // Iterate through the history records in reverse order.
        for (let i = this.list.length - 1; i >= 0; i--) {
            const record = this.list[i];

            // Check if the user id of the board event is different from the given user id.
            // If so, skip the current record since it does not relate to the user.
            if (record.event.body.userId !== userId) {
                continue;
            }

            if (record.event.body.operation.method === "undo") {
                // I the record is undo increment the counter to track the number of "undo" actions.
                counter++;
            } else if (counter === 0) {
                // If the counter is 0, it means that we have found the most recent "undo" action performed by the user.
                // Return the current history record.
                return record;
            } else {
                // Decrement the counter since the current record does not represent an "undo" action.
                counter--;
            }
        }

        // Return null if no undoable record is found for the user.
        return null;
    }

    /**
     * Returns the most recent redoable undo history record for a given user.
     * @param userId - The id of the user.
     * @returns The history record, or null if no such record is found.
     */
    getUserRedoRecord(userId: number): HistoryRecord | null {
        // Initialize a counter to track the number of "redo" actions performed by the user.
        let counter = 0;

        // Iterate through the history records in reverse order.
        for (let i = this.list.length - 1; i >= 0; i--) {
            const record = this.list[i];

            // Check if the user id of the current record is different from the given user id.
            // If so, skip the current record since it does not relate to the user.
            if (record.event.body.userId !== userId) {
                continue;
            }

            // Retrieve the method from the operation of the current record.
            const { method } = record.event.body.operation;

            // Check if the method is "redo".
            if (method === "redo") {
                // Increment the counter to track the number of "redo" actions.
                counter++;
            } else if (method === "undo") {
                if (counter > 0) {
                    // If the method is "undo" and the counter is greater than 0, it means that the current record represents an "undo" action
                    // that was followed by one or more "redo" actions. Decrement the counter to reflect this.
                    counter--;
                } else if (counter === 0) {
                    // If the counter is 0, it means that we have found the most recent redoable "undo" action performed by the user.
                    // Return the current history record.
                    return record;
                }
            }
        }

        // Return null if no redoable undo record is found for the user.
        return null;
    }

    getRecordById(id: string): HistoryRecord | undefined {
        for (const record of this.list) {
            const boardEvent = record.event;
            const boardEventBody = boardEvent.body;
            if (boardEventBody.eventId === id) {
                return record;
            }
        }
        return undefined;
    }
}
