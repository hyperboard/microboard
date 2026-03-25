import type { Connection } from "Settings";
import type { BoardEventBody, BoardEventPackBody } from "./Events";

type EventIdentityBody = Pick<
  BoardEventBody | BoardEventPackBody,
  "sessionId" | "authorUserId" | "userId"
>;

export function getBoardEventSessionId(body: EventIdentityBody): string | undefined {
  if (body.sessionId) {
    return body.sessionId;
  }
  if (body.userId === undefined || body.userId === null) {
    return undefined;
  }
  return String(body.userId);
}

function getBoardEventAuthorUserId(body: EventIdentityBody): string | undefined {
  return body.authorUserId;
}

export function getConnectionSessionId(connection?: Connection): string {
  return connection?.getSessionId?.() || connection?.sessionId || String(connection?.connectionId || 0);
}

export function getConnectionSessionIds(connection?: Connection): string[] {
  const ids = new Set<string>();
  const primary = connection?.getSessionId?.() || connection?.sessionId;
  if (primary) {
    ids.add(primary);
  }
  if (connection?.connectionId !== undefined) {
    ids.add(String(connection.connectionId));
  }
  if (ids.size === 0) {
    ids.add("0");
  }
  return Array.from(ids);
}

export function getConnectionAuthorUserId(connection?: Connection): string | undefined {
  return (
    connection?.getAuthorUserId?.() ||
    connection?.authorUserId ||
    connection?.getCurrentUser?.()
  );
}
