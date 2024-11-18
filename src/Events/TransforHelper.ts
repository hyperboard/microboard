import { Connector, ConnectorData, Item } from "Board/Items";
import { BoardPoint, ControlPoint } from "Board/Items/Connector";
import { ConnectorEdge } from "Board/Items/Connector/Pointers";
import { SyncBoardEvent } from "./Events";
import { RemoveItem } from "Board/BoardOperations";
import { Board } from "Board";

export class TransformConnectorHelper {
	static replaceConnectorEdges(
		connector: Connector,
		removedItems: Item[],
	): void {
		const replaceConnectorEdge = (
			point: ControlPoint,
			edge: ConnectorEdge,
		): void => {
			if (point.pointType !== "Board") {
				const pointData = new BoardPoint(point.x, point.y);
				const item = removedItems.find(
					item => item.getId() === point.item.getId(),
				);
				if (item) {
					if (edge === "start") {
						connector.applyStartPoint(pointData);
					} else {
						connector.applyEndPoint(pointData);
					}
				}
			}
		};

		replaceConnectorEdge(connector.getStartPoint(), "start");
		replaceConnectorEdge(connector.getEndPoint(), "end");
	}
	static handleRemoveSnappedObject(
		board: Board,
		events: SyncBoardEvent[],
	): string[] | undefined {
		const connectorsToDelete: string[] = [];
		const connectorsToAdd: ConnectorData[] = [];
		const removeEvent = events.find(
			ev =>
				ev.body.operation.class === "Board" &&
				ev.body.operation.method === "remove",
		);
		if (removeEvent) {
			const rmOp = removeEvent.body.operation as RemoveItem;
			const removedItemId = Array.isArray(rmOp.item)
				? rmOp.item[0]
				: rmOp.item;
			const removedItem = board.items.findById(removedItemId);

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

			if (!removedItem) {
				return;
			}

			connectors.forEach(connector => {
				this.replaceConnectorEdges(connector as Connector, [
					removedItem,
				]);
				const conData: ConnectorData =
					connector.serialize() as ConnectorData;
				connectorsToDelete.push(connector.getId());
				connectorsToAdd.push(conData);
			});

			connectorsToAdd.forEach(conData => {
				board.emit({
					class: "Board",
					method: "add",
					data: conData,
					item: board.getNewItemId(),
				});
			});
		}

		return connectorsToDelete;
	}
}
