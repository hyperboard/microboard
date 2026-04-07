import type { Board, BoardSnapshot } from "Board";
import type { SyncBoardEvent } from "Events/Events";
import type { BaseItem, BaseItemData } from "Items/BaseItem/BaseItem";
import { Connector } from "Items/Connector/Connector";
import type { ConnectorData } from "Items/Connector/ConnectorOperations";
import { connectorOps } from "Items/Connector/connectorOps";
import type { Item, ItemDataWithId } from "Items/Item";
import {
  deserializeHtml,
  serializeDocumentHtml,
  type ComponentNode,
  type JsonValue,
} from "web-component-json-codec";
import {
  BOARD_DOCUMENT_TAG,
  buildBoardHtmlSchemaRegistry,
  htmlTagToItemType,
  itemTypeToHtmlTag,
} from "./codecSchemaRegistry";
import {
  deserializeLegacyHTMLAndEmitToBoard,
  deserializeLegacyHTMLToBoard,
  parseLegacyHTML,
} from "./LegacyBoardHTMLAdapter";

type ItemSnapshot = ItemDataWithId & { parent?: string; childIds?: string[]; children?: string[] };
type ParsedBoardHtmlSnapshot = BoardSnapshot & { name?: string };

const HTML_FORMAT = "microboard/html";
const HTML_VERSION = 2;

export function parseHTML(el: HTMLElement) {
  return parseLegacyHTML(el);
}

export function serializeBoardToHTML(board: Board): string {
  const boardName = board.getName() || board.getBoardId() || "Untitled board";
  const registry = buildBoardHtmlSchemaRegistry();
  const snapshot = board.serialize();
  const documentNode: ComponentNode = {
    type: BOARD_DOCUMENT_TAG,
    properties: {
      boardId: board.getBoardId(),
      format: HTML_FORMAT,
      lastEventOrder: board.events?.log.getLastIndex() ?? 0,
      name: boardName,
      version: HTML_VERSION,
    },
    children: buildBoardComponentTree(snapshot),
  };

  const html = serializeDocumentHtml(documentNode, registry, {
    title: `Microboard ${boardName}`,
  });

  return html.replace("</body>", `${getStandaloneImportBootstrap(boardName)}\n</body>`);
}

export function deserializeHTMLAndEmitToBoard(board: Board, stringedHTML: string): string[] {
  if (looksLikeLegacyHtml(stringedHTML)) {
    return deserializeLegacyHTMLAndEmitToBoard(board, stringedHTML);
  }

  const snapshot = tryDeserializeBoardHtml(stringedHTML);
  if (!snapshot) {
    return deserializeLegacyHTMLAndEmitToBoard(board, stringedHTML);
  }

  const remapped = remapSnapshotForImport(snapshot.items as ItemSnapshot[], () => board.getNewItemId());
  board.emit({
    class: "Board",
    method: "add",
    item: remapped.map((item) => item.id),
    data: Object.fromEntries(remapped.map((item) => [item.id, item])),
  });
  finalizeImportedItems(board, remapped);
  return remapped.map((item) => item.id);
}

export function deserializeHTMLToBoard(board: Board, stringedHTML: string): void {
  if (looksLikeLegacyHtml(stringedHTML)) {
    deserializeLegacyHTMLToBoard(board, stringedHTML);
    return;
  }

  const snapshot = tryDeserializeBoardHtml(stringedHTML);
  if (!snapshot) {
    deserializeLegacyHTMLToBoard(board, stringedHTML);
    return;
  }

  if (snapshot.name) {
    board.setName(snapshot.name);
  }
  board.deserialize(snapshot);
}

function tryDeserializeBoardHtml(stringedHTML: string): ParsedBoardHtmlSnapshot | null {
  try {
    const root = deserializeHtml(
      stringedHTML,
      buildBoardHtmlSchemaRegistry(),
    ) as ComponentNode;
    if (root.type !== BOARD_DOCUMENT_TAG) {
      return null;
    }

    const lastIndex = typeof root.properties.lastEventOrder === "number"
      ? root.properties.lastEventOrder
      : 0;
    const name = typeof root.properties.name === "string" ? root.properties.name : undefined;
    const items = flattenBoardDocument(root.children);

    return {
      items,
      events: [] as SyncBoardEvent[],
      lastIndex,
      ...(name ? { name } : {}),
    };
  } catch {
    return null;
  }
}

function buildBoardComponentTree(items: ItemDataWithId[]): ComponentNode[] {
  const nodes = new Map<string, ComponentNode>();
  const roots: ComponentNode[] = [];
  const parentIds = new Map<string, string>();

  for (const item of items) {
    nodes.set(item.id, {
      type: itemTypeToHtmlTag(item.itemType),
      properties: serializeItemProperties(item),
      children: [],
    });

    const explicitParent = (item as ItemSnapshot).parent;
    if (explicitParent && explicitParent !== "Board") {
      parentIds.set(item.id, explicitParent);
    }

    const childIds = (item as ItemSnapshot).childIds || (item as ItemSnapshot).children;
    childIds?.forEach((childId) => {
      parentIds.set(childId, item.id);
    });
  }

  for (const item of items) {
    const node = nodes.get(item.id);
    if (!node) {
      continue;
    }
    const parentId = parentIds.get(item.id) ?? (item as ItemSnapshot).parent ?? "Board";
    if (parentId && parentId !== "Board") {
      const parentNode = nodes.get(parentId);
      if (parentNode) {
        parentNode.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  return roots;
}

function serializeItemProperties(item: ItemDataWithId): Record<string, JsonValue> {
  const {
    childIds: _childIds,
    children: _children,
    id,
    itemType: _itemType,
    parent: _parent,
    ...rest
  } = item as ItemSnapshot;

  return {
    id,
    ...toJsonRecord(rest),
  };
}

function flattenBoardDocument(
  nodes: ComponentNode[],
): ItemSnapshot[] {
  const items: ItemSnapshot[] = [];

  for (const node of nodes) {
    const itemType = htmlTagToItemType(node.type);
    if (!itemType) {
      continue;
    }

    const id = typeof node.properties.id === "string" ? node.properties.id : "";
    if (!id) {
      continue;
    }

    const children = flattenBoardDocument(node.children);
    const childIds = children.map((child) => child.id);
    const properties = { ...toUnknownRecord(node.properties) };
    delete properties.id;

    const item: ItemSnapshot = {
      id,
      itemType,
      ...properties,
      ...(childIds.length > 0 ? { childIds } : {}),
    } as ItemSnapshot;

    items.push(item, ...children);
  }

  return items;
}

function remapSnapshotForImport(
  items: ItemSnapshot[],
  createId: () => string,
): ItemSnapshot[] {
  const idMap = new Map<string, string>();
  for (const item of items) {
    idMap.set(item.id, createId());
  }

  return items.map((item) => {
    const remapped = structuredClone(item) as ItemSnapshot;
    remapped.id = idMap.get(item.id) ?? item.id;
    remapped.parent = item.parent && item.parent !== "Board"
      ? (idMap.get(item.parent) ?? item.parent)
      : "Board";
    if (remapped.childIds) {
      remapped.childIds = remapped.childIds.map((childId) => idMap.get(childId) ?? childId);
    }
    if (remapped.children) {
      remapped.children = remapped.children.map((childId) => idMap.get(childId) ?? childId);
    }
    if (remapped.itemType === "Connector") {
      remapConnectorPoints(remapped as ConnectorData & { id: string }, idMap);
    }
    return remapped;
  });
}

function remapConnectorPoints(
  connector: ConnectorData & { id: string },
  idMap: Map<string, string>,
): void {
  for (const point of [connector.startPoint, connector.endPoint, connector.middlePoint]) {
    if (point && typeof point === "object" && "itemId" in point && typeof point.itemId === "string") {
      point.itemId = idMap.get(point.itemId) ?? point.itemId;
    }
  }
}

function finalizeImportedItems(board: Board, items: ItemSnapshot[]): void {
  const createdConnectors: Record<
    string,
    { item: Connector; itemData: ConnectorData & { id: string } }
  > = {};
  const createdContainers: Record<
    string,
    { item: Item; itemData: BaseItemData & { childIds?: string[]; children?: string[] } }
  > = {};

  for (const itemData of items) {
    const item = board.items.findById(itemData.id);
    if (!item) {
      continue;
    }
    if (item.itemType === "Connector") {
      createdConnectors[itemData.id] = {
        item: item as Connector,
        itemData: itemData as ConnectorData & { id: string },
      };
    }
    if ("index" in item && item.index) {
      createdContainers[item.getId()] = {
        item,
        itemData: itemData as BaseItemData & { childIds?: string[]; children?: string[] },
      };
    }
  }

  for (const key in createdConnectors) {
    const { item, itemData } = createdConnectors[key];
    item.apply(connectorOps.setStartPoint([item], itemData.startPoint));
    item.apply(connectorOps.setEndPoint([item], itemData.endPoint));
  }

  for (const key in createdContainers) {
    const { item, itemData } = createdContainers[key];
    const childIds = itemData.childIds || itemData.children;
    if (!childIds || childIds.length === 0) {
      continue;
    }

    const needsReparent = childIds.some((childId) => {
      const child = board.items.findById(childId) as BaseItem | undefined;
      return child && child.parent !== item.getId();
    });

    if (needsReparent) {
      (item as BaseItem).applyAddChildren(childIds);
      continue;
    }

    childIds.forEach((childId) => {
      const child = board.items.findById(childId);
      if (child) {
        (item as any).index?.insert(child);
      }
    });
    (item as any).updateChildrenIds?.();
  }
}

function looksLikeLegacyHtml(stringedHTML: string): boolean {
  return /id=["']items["']/.test(stringedHTML);
}

function toJsonRecord(
  value: Record<string, unknown>,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [key, nested] of Object.entries(value)) {
    const jsonValue = toJsonValue(nested);
    if (jsonValue !== undefined) {
      result[key] = jsonValue;
    }
  }
  return result;
}

function toUnknownRecord(
  value: Record<string, JsonValue>,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value));
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => toJsonValue(entry))
      .filter((entry): entry is JsonValue => entry !== undefined);
    return entries;
  }
  if (typeof value === "object") {
    return toJsonRecord(value as Record<string, unknown>);
  }
  return undefined;
}

function getStandaloneImportBootstrap(boardName: string): string {
  const escapedName = JSON.stringify(boardName);
  return `
    <section id="microboard-export-open" style="font-family: 'Open Sans', sans-serif; max-width: 32rem; margin: 3rem auto; padding: 1.25rem 1.5rem; border: 1px solid #d9dde7; border-radius: 16px; background: #ffffff; color: #1d2736; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);">
      <h1 style="margin: 0 0 0.75rem; font-size: 1.125rem;">Open Board In Editor</h1>
      <p id="microboard-export-status" style="margin: 0 0 1rem; line-height: 1.5;">Opening this export in Microboard editor…</p>
      <a id="microboard-export-link" href="https://app.microboard.io/boards/blank" target="_blank" rel="noreferrer" style="display: inline-flex; align-items: center; justify-content: center; padding: 0.7rem 1rem; border-radius: 999px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700;">Open in Microboard</a>
    </section>
    <script>
      (() => {
        const html = document.documentElement.outerHTML;
        const name = ${escapedName};
        const defaultAppUrl = "https://app.microboard.io/boards/blank";
        const appUrl = window.location.protocol === "file:" ? defaultAppUrl : new URL("/boards/blank", window.location.origin).href;
        const statusEl = document.getElementById("microboard-export-status");
        const linkEl = document.getElementById("microboard-export-link");
        if (linkEl) {
          linkEl.href = appUrl;
        }

        const openedWindow = window.open(appUrl, "_blank");
        if (!openedWindow) {
          if (statusEl) {
            statusEl.textContent = "Popup blocked. Use the button below to open this board in the editor.";
          }
          return;
        }

        if (statusEl) {
          statusEl.textContent = "Waiting for editor…";
        }

        const targetOrigin = new URL(appUrl).origin;
        const timeout = window.setTimeout(() => {
          if (statusEl) {
            statusEl.textContent = "Editor did not respond yet. The button below can be used to retry.";
          }
        }, 60000);

        function onMessage(event) {
          if (event.source !== openedWindow) return;
          if (event.data && event.data.type === "microboard-snapshot-ready") {
            window.removeEventListener("message", onMessage);
            window.clearTimeout(timeout);
            openedWindow.postMessage({ type: "microboard-snapshot", html, name }, targetOrigin);
            if (statusEl) {
              statusEl.textContent = "Board sent to editor.";
            }
          }
        }

        window.addEventListener("message", onMessage);
      })();
    </script>`;
}
