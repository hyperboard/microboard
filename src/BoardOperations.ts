import { ItemData } from "./Items";
import { GroupData } from "./Items/Group";

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

export interface CreateItem extends SingleItemBoardOp {
	method: "add";
	data: ItemData;
}

export interface CreateLockedGroupItem extends SingleItemBoardOp {
	method: "addLockedGroup";
	data: GroupData;
}

export interface RemoveItem extends MultiItemBoardOp {
	method: "remove";
}

export interface RemoveLockedGroup extends MultiItemBoardOp {
	method: "removeLockedGroup";
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
	| CreateLockedGroupItem
	| RemoveItem
	| RemoveLockedGroup
	| MoveToZIndex
	| MoveManyToZIndex
	| MoveSecondBeforeFirst
	| MoveSecondAfterFirst
	| BringToFront
	| SendToBack
	| Paste
	| Duplicate;
