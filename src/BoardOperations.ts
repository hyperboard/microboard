import { ItemData } from "./Items";

interface CreateItem {
	class: "Board";
	method: "add";
	item: string;
	data: ItemData;
}

export interface RemoveItem {
	class: "Board";
	method: "remove";
	item: string[];
}

interface MoveToZIndex {
	class: "Board";
	method: "moveToZIndex";
	item: string;
	zIndex: number;
}

interface MoveSecondBeforeFirst {
	class: "Board";
	method: "moveSecondBeforeFirst";
	item: string;
	secondItem: string;
}

interface MoveSecondAfterFirst {
	class: "Board";
	method: "moveSecondAfterFirst";
	item: string;
	secondItem: string;
}

interface BringToFront {
	class: "Board";
	method: "bringToFront";
	item: string;
}

interface SendToBack {
	class: "Board";
	method: "sendToBack";
	item: string;
}

interface Paste {
	class: "Board";
	method: "paste";
	itemsMap: { [key: string]: ItemData };
}

interface Duplicate {
	class: "Board";
	method: "duplicate";
	itemsMap: { [key: string]: ItemData };
}

/* export interface BoardItemOperation {
	class: "Board";
	method: "itemOperation";
	item: string | string[];
	itemOperation: ItemOperation;
} */

export type BoardOperation =
	| CreateItem
	| RemoveItem
	| MoveToZIndex
	| MoveSecondBeforeFirst
	| MoveSecondAfterFirst
	| BringToFront
	| SendToBack
	| Paste
	| Duplicate;
