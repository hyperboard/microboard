import { Board } from "Board";
import { conf } from "Settings";
import { parsersHTML } from "./Parser";
import { Connector } from "Items/Connector/Connector";
import { ConnectorData } from "Items/Connector/ConnectorOperations";
import { BaseItem, BaseItemData } from "Items/BaseItem/BaseItem";
import { Item, ItemData, ItemDataWithId } from "Items/Item";
import { connectorOps } from "Items/Connector/connectorOps";

export function parseHTML(
  el: HTMLElement
):
  | ItemDataWithId
  | { data: BaseItemData & { id: string }; childrenMap: { [id: string]: ItemDataWithId } } {
  const parser = parsersHTML[el.tagName.toLowerCase()];
  if (!parser) {
    throw new Error(`Unknown element tag: ${el.tagName.toLowerCase()}`);
  }

  return parser(el);
}

export function serializeBoardToHTML(board: Board): string {
  const boardName = board.getName() || board.getBoardId();

  // div with id="items" and last-event-order are necessary for successfull uploading to storage
  const items = board.index.items.getWholeHTML(conf.documentFactory);
  const itemsDiv = `<div id="items">${items}</div>`;
  const scripts = `
			<script type="module" src="https://unpkg.com/microboard-ui-temp/dist/customWebComponents.js"></script>
      <script type="module" src="https://unpkg.com/microboard-ui-temp/dist/controlsHandlers.js"></script>
      <script type="module" src="https://unpkg.com/microboard-ui-temp/dist/titlePanel.js"></script>
      <script defer src="https://unpkg.com/microboard-ui-temp/dist/loadLinksImages.js"></script>
		`;
  const body = `<body style="overflow-x: hidden; overflow-y: hidden;">${itemsDiv}${scripts}</body>`;
  const head = `
      <head>
        <meta charset="utf-8" />
        <meta name="last-event-order" content="${board.events?.log.getLastIndex()}" />
        <title>Microboard ${boardName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" crossorigin href="https://unpkg.com/microboard-ui-temp/dist/board.css" />
      </head>`.replace(/\t|\n/g, "");
  return `${head}${body}`;
}

/** @returns ids of added items */
export function deserializeHTMLAndEmitToBoard(board: Board, stringedHTML: string): string[] {
  const parser = conf.getDOMParser();
  const doc = parser.parseFromString(stringedHTML, "text/html");
  const items = doc.body.querySelector("#items");
  if (items) {
    const idsMap: Record<string, string> = {};
    const addedConnectors: { item: Connector; data: ConnectorData }[] = [];
    const data = Array.from(items.children).map((el) =>
      parseHTML(el as HTMLElement)
    );
    for (const parsedData of data) {
      if ("childrenMap" in parsedData) {
        // Frame
        const frameData = parsedData as { data: BaseItemData & { id: string }; childrenMap: { [id: string]: ItemDataWithId } };
        const addedFrame: BaseItem = board.add(
          board.createItem(board.getNewItemId(), frameData.data as unknown as ItemData)
        );
        const addedChildren = (
          Object.values(frameData.childrenMap) as unknown as ItemDataWithId[]
        ).map((childData) => {
          const created = board.createItem(board.getNewItemId(), childData);
          const added = board.add(created);
          idsMap[childData.id] = added.getId();
          if (added.itemType === "Connector") {
            addedConnectors.push({
              item: added as Connector,
              data: childData as ConnectorData,
            });
          }
          return added;
        });
        addedFrame.addChildItems(addedChildren);
        (frameData.data as any).children = addedChildren.map((item) => item.getId());
        idsMap[frameData.data.id] = addedFrame.getId();
      } else {
        const itemData = parsedData as ItemDataWithId;
        const added = board.add(
          board.createItem(board.getNewItemId(), itemData)
        );
        if (added.itemType === "Connector") {
          addedConnectors.push({
            item: added as Connector,
            data: itemData as unknown as ConnectorData,
          });
        }
        idsMap[itemData.id] = added.getId();
      }
    }
    addedConnectors.forEach((connector) => {
      const startData = {
        ...connector.data.startPoint,
        ...("itemId" in connector.data.startPoint
          ? { itemId: idsMap[connector.data.startPoint.itemId] }
          : {}),
      };
      const endData = {
        ...connector.data.endPoint,
        ...("itemId" in connector.data.endPoint
          ? { itemId: idsMap[connector.data.endPoint.itemId] }
          : {}),
      };

      connector.item.apply(connectorOps.setStartPoint([connector.item], startData));
      connector.item.apply(connectorOps.setEndPoint([connector.item], endData));
    });
    return Object.values(idsMap);
  }

  return [];
}

export function deserializeHTMLToBoard(board: Board, stringedHTML: string): void {
  const parser = conf.getDOMParser();
  const doc = parser.parseFromString(stringedHTML, "text/html");
  const itemsDiv = doc.body.querySelector("#items");
  if (!itemsDiv) {
    return;
  }
  const items = Array.from(itemsDiv.children).map((el) =>
    parseHTML(el as HTMLElement)
  );

  board.index.clear();
  const createdConnectors: Record<
    string,
    { item: Connector; itemData: ConnectorData & { id: string } }
  > = {};
  const createdGroups: Record<
    string,
    { item: BaseItem; itemData: BaseItemData }
  > = {};

  const addItem = (itemData: ItemData & { id: string }): Item => {
    const item = board.createItem(itemData.id, itemData);
    if (item.itemType === "Connector") {
      createdConnectors[itemData.id] = {
        item: item as Connector,
        itemData: itemData as ConnectorData & { id: string },
      };
    }
    if ("index" in item && item.index) {
      createdGroups[item.getId()] = { item, itemData };
    }
    board.index.insert(item);
    return item;
  };

  for (const rawItemData of items) {
    if ("childrenMap" in rawItemData) {
      // Frame
      const frameData = rawItemData as { data: ItemData & { id: string }; childrenMap: { [id: string]: ItemDataWithId } };
      (Object.values(frameData.childrenMap) as ItemDataWithId[]).map(
        (childData) => addItem(childData)
      );
      addItem(frameData.data);
    } else {
      addItem(rawItemData as ItemData & { id: string });
    }
  }

  for (const key in createdConnectors) {
    const { item, itemData } = createdConnectors[key];
    item.apply(connectorOps.setStartPoint([item as Connector], itemData.startPoint));
    item.apply(connectorOps.setEndPoint([item as Connector], itemData.endPoint));
  }
  for (const key in createdGroups) {
    const { item, itemData } = createdGroups[key];
    const childIds = (itemData).childIds;
    if (childIds) {
      item.applyAddChildren(childIds);
    }
  }
}
