# UI Agent Guide: `microboard/protocol`

Use `microboard/protocol` as the only public import path for websocket and
handshake contracts.

## Imports

Prefer:

```ts
import {
  parseSocketMsg,
  safeParseSocketMsg,
  BoardConnectResponseSchema,
  TemplateConnectResponseSchema,
} from "microboard/protocol";
```

Do not import protocol types or schemas from internal paths like
`Events/MessageRouter/socketContract` or `Events/MessageRouter/*`.

## Incoming websocket messages

If UI code delegates board events into Microboard, pass decoded JSON objects to
the router boundary:

```ts
messageRouter.handleMessage(parsedJson, board);
```

Microboard now validates the payload at router ingress and drops invalid socket
messages with a warning.

## Behavior note

This is the only intentional runtime behavior change in the new layer:

- before: unchecked decoded payloads could reach board handlers
- now: invalid socket payloads are rejected at ingress and not dispatched

Valid messages should behave the same as before.

## `BoardSubscriptionCompleted`

There are two shapes now:

- wire shape: loose backend-compatible payload
- normalized shape: strict app-facing payload used inside Microboard

UI code outside Microboard should generally treat `BoardSubscriptionCompleted`
as a wire message and let Microboard normalize it internally.

## Handshakes

Use:

- `BoardConnectResponseSchema`
- `TemplateConnectResponseSchema`

to validate HTTP handshake responses before storing connection metadata.
