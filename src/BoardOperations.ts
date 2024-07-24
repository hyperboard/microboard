import { ItemData } from "./Items";

export type ItemsIndexRecord = Record<string, number>;

interface BoardOp {
	class: "Board";
}

interface SingleItemBoardOp extends BoardOp {
	item: string;
}

interface MultiItemBoardOp extends BoardOp {
	item: string[];
}

interface ItemMapBoardOp extends BoardOp {
	itemsMap: { [key: string]: ItemData };
}

interface CreateItem extends SingleItemBoardOp {
	method: "add";
	data: ItemData;
}

export interface RemoveItem extends MultiItemBoardOp {
	method: "remove";
}

interface MoveToZIndex extends SingleItemBoardOp {
	method: "moveToZIndex";
	zIndex: number;
}

interface MoveManyToZIndex extends BoardOp {
	method: "moveManyToZIndex";
	item: ItemsIndexRecord;
}

interface MoveSecondBeforeFirst extends SingleItemBoardOp {
	method: "moveSecondBeforeFirst";
	secondItem: string;
}

interface MoveSecondAfterFirst extends SingleItemBoardOp {
	method: "moveSecondAfterFirst";
	secondItem: string;
}

interface BringToFront extends MultiItemBoardOp {
	method: "bringToFront";
	prevZIndex: ItemsIndexRecord;
}

interface SendToBack extends MultiItemBoardOp {
	method: "sendToBack";
	prevZIndex: ItemsIndexRecord;
}

interface Paste extends ItemMapBoardOp {
	method: "paste";
	select: boolean;
}

interface Duplicate extends ItemMapBoardOp {
	method: "duplicate";
}

export type BoardOps =
	| CreateItem
	| RemoveItem
	| MoveToZIndex
	| MoveManyToZIndex
	| MoveSecondBeforeFirst
	| MoveSecondAfterFirst
	| BringToFront
	| SendToBack
	| Paste
	| Duplicate;
