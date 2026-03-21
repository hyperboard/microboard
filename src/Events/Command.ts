import type { Board } from 'Board';
import {BaseOperation, Operation} from './EventsOperations';

export interface Command {
	apply(): void;

	revert(): void;

	merge?: (op: Operation) => Command;
}

export { BaseCommand } from "./BaseCommand";

export interface ItemCommandFactory {
	(
		items: any[],
		operation: any,
		board?: Board,
	): Command;
}

export class NoOpCommand {
	constructor(public reason: string) {}

	merge(_op: unknown): this {
		return this;
	}

	apply(): void {
		console.warn(`NoOpCommand applied due to: ${this.reason}`);
	}

	revert(): void {
		console.warn(`NoOpCommand reverted due to: ${this.reason}`);
	}
}
