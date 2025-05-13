import { Connector, ConnectorData, Item } from "Board/Items";
import { BoardPoint } from "Board/Items/Connector";
import { ConnectorEdge } from "Board/Items/Connector/Pointers";
import { SyncBoardEvent } from "./Events";
import { RemoveItem } from "Board/BoardOperations";
import { Board } from "Board";
import { EventsList } from "./Log/createEventsList";

/**
 * Handles the removal of snapped objects from the board by replacing any connected
 * connectors with updated versions that are no longer attached to the removed item.
 *
 * @param board - The board instance containing the items
 * @param events - Array of synchronization events to process
 * @param list - The event list to update
 */
export function handleRemoveSnappedObject(
	board: Board,
	events: SyncBoardEvent[],
	list: EventsList,
): void {
	const connectorsToDelete: string[] = [];
	const connectorsToAdd: ConnectorData[] = [];
	const removeEvent = events.find(
		ev =>
			ev.body.operation.class === "Board" &&
			ev.body.operation.method === "remove",
	);

	if (!removeEvent) {
		return;
	}

	const rmOp = removeEvent.body.operation as RemoveItem;
	const removedItemId = Array.isArray(rmOp.item) ? rmOp.item[0] : rmOp.item;
	const removedItem = board.items.findById(removedItemId);

	if (!removedItem) {
		return;
	}

	const connectors = board.items.listAll().filter(it => {
		if (it.itemType !== "Connector") {
			return false;
		}
		const endPoint = it.getEndPoint();
		const startPoint = it.getStartPoint();

		if (endPoint.pointType !== "Board") {
			const endItemId = endPoint.item.getId();
			if (endItemId === removedItemId) {
				return true;
			}
		}
		if (startPoint.pointType !== "Board") {
			const startItemId = startPoint.item.getId();
			if (startItemId === removedItemId) {
				return true;
			}
		}
		return false;
	});

	connectors.forEach(connector => {
		replaceConnectorEdges(connector as Connector, [removedItem]);
		const conData: ConnectorData = connector.serialize() as ConnectorData;
		connectorsToDelete.push(connector.getId());
		connectorsToAdd.push(conData);
	});

	connectorsToAdd.forEach(conData => {
		board.apply({
			class: "Board",
			method: "add",
			data: conData,
			item: board.getNewItemId(),
		});
	});

	if (connectorsToDelete.length > 0) {
		list.removeUnconfirmedEventsByItems(connectorsToDelete);
		connectorsToDelete.forEach(item => {
			board.apply({
				class: "Board",
				method: "remove",
				item: [item],
			});
		});
	}
}

/**
 * Replaces connector edges that were attached to removed items with BoardPoints
 * so that the connectors are no longer attached to the deleted items.
 *
 * @param connector - The connector whose edges need to be updated
 * @param removedItems - Array of items that have been removed from the board
 */
function replaceConnectorEdges(
	connector: Connector,
	removedItems: Item[],
): void {
	const edgePoints = [
		{ point: connector.getStartPoint(), edge: "start" as ConnectorEdge },
		{ point: connector.getEndPoint(), edge: "end" as ConnectorEdge },
	];

	for (const { point, edge } of edgePoints) {
		if (point.pointType === "Board") {
			continue;
		}

		const pointData = new BoardPoint(point.x, point.y);
		const itemFound = removedItems.find(
			item => item.getId() === point.item.getId(),
		);

		if (!itemFound) {
			continue;
		}

		if (edge === "start") {
			connector.applyStartPoint(pointData);
		} else {
			connector.applyEndPoint(pointData);
		}
	}
}
