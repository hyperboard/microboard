# Server Agent Guide: `microboard/protocol`

Use `microboard/protocol` as the source of truth for websocket and handshake
payloads exposed by Microboard.

## Imports

Prefer:

```ts
import {
  BoardConnectResponseSchema,
  TemplateConnectResponseSchema,
  BoardEventMsgSchema,
  PresenceEventMsgSchema,
  BoardSubscriptionCompletedMsgSchema,
  ConfirmationMsgSchema,
  ErrorMsgSchema,
  PingMsgSchema,
  PongMsgSchema,
} from "microboard/protocol";
```

Do not target internal paths from the library repo.

## What the server should emit

Use wire-level schemas for transport payloads:

- `BoardConnectResponseSchema`
- `TemplateConnectResponseSchema`
- `BoardEventMsgSchema`
- `PresenceEventMsgSchema`
- `BoardSubscriptionCompletedMsgSchema`
- `ConfirmationMsgSchema`
- `ErrorMsgSchema`
- `PingMsgSchema`
- `PongMsgSchema`

`BoardSubscriptionCompletedMsgSchema` is intentionally loose enough to represent
current backend behavior, including template snapshots and `mode: string`.

## Recommended stricter practice

Even though the wire schema currently permits looser payloads, the server should
prefer to emit:

- `mode` as `"view" | "edit"`
- `eventsSinceLastSnapshot` as real sync events
- `JSONSnapshot` in board-compatible shape whenever possible

That keeps the server aligned with the client’s normalized shape and reduces the
need for compatibility shims.

## Behavior note

Clients using the new layer now validate socket payloads at ingress. That means:

- malformed websocket messages that previously slipped through may now be
  dropped before dispatch
- valid messages should remain behaviorally unchanged

If a server-side change causes a client to stop reacting to a message, first
validate the payload against the exported `microboard/protocol` schema.
