# Local MCP Architecture Report For `microboard`

## 1. Summary

`microboard` already contains the most valuable reusable part of a future local MCP stack:

- a headless-capable `Board` model
- a reusable event log and sync engine
- a public websocket protocol contract
- Node/Bun entrypoints and document/path abstractions

What it does **not** currently own is the runtime that a local MCP client actually needs:

- browser login bootstrap
- local credential persistence
- token expiry / refresh orchestration
- websocket handshake / reconnect policy
- board session restoration across reconnects

Today those responsibilities live mostly in [`microboardUI/src/App/Connection.ts`](/home/alex/github/hyperboard/microboardUI/src/App/Connection.ts) and [`microboardUI/src/entities/account/Account.ts`](/home/alex/github/hyperboard/microboardUI/src/entities/account/Account.ts), while `microboard` only exposes integration hooks through [`microboard/src/Settings.ts`](/home/alex/github/hyperboard/microboard/src/Settings.ts) and a refresh-aware fetch helper in [`microboard/src/api/AuthRequest.ts`](/home/alex/github/hyperboard/microboard/src/api/AuthRequest.ts).

The recommended direction is:

- keep MCP protocol handling **outside** `microboard`
- keep the low-level board model + sync engine **inside** `microboard`
- add a reusable **headless runtime layer** on top of `microboard`
- make the future local MCP package a thin adapter from MCP tools to that runtime

The main architectural gap is not websocket sync. It is the absence of a reusable headless session/connection runtime that currently exists only inside the browser UI.

## 2. Relevant Existing Modules

### Core board model and mutation engine

- [`microboard/src/Board.ts`](/home/alex/github/hyperboard/microboard/src/Board.ts)
  - Owns the board state, item index, selection, tools, presence, camera, serialization, snapshot load/save, and board-level high-level methods such as `add`, `createItemAndAdd`, `remove`, `group`, `ungroup`, `paste`, `duplicate`, `bringToFront`, `sendToBack`.
  - Reusable for local MCP: **yes, mostly**.
  - Refactor needed: yes.
  - Main issues:
    - mixes headless-safe state logic with browser-only concerns:
      - `window.location.search` in board-load focus logic via message router
      - `navigator.userAgent` in `setInterfaceType()`
      - `localStorage` / `indexedDB` snapshot helpers
    - exposes many UI-oriented methods but lacks a small agent-oriented runtime facade

- [`microboard/src/BoardOperations.ts`](/home/alex/github/hyperboard/microboard/src/BoardOperations.ts)
  - Defines board-level operation types.
  - Reusable for local MCP: **yes**, but these are too low-level for direct MCP exposure.
  - Best used behind a semantic runtime API.

- [`microboard/src/Geometry/Transformation/transformOps.ts`](/home/alex/github/hyperboard/microboard/src/Geometry/Transformation/transformOps.ts)
  - Factory helpers for move/scale/rotate/apply-matrix operations.
  - Reusable for local MCP: **yes**.
  - Good building block for high-level mutations like move/resize.

- [`microboard/src/Items/propertyOps.ts`](/home/alex/github/hyperboard/microboard/src/Items/propertyOps.ts)
  - Generic set-property operation helper.
  - Reusable for local MCP: **yes**, but risky if exposed raw.
  - Should stay an internal primitive behind validated item-specific or semantic update APIs.

### Sync, event log, and websocket message application

- [`microboard/src/Events/Events.ts`](/home/alex/github/hyperboard/microboard/src/Events/Events.ts)
  - Owns local event emission, undo/redo, event identity assignment, pending event handling, and presence publishing.
  - Reusable for local MCP: **yes**.
  - Strong candidate to stay inside `microboard`.
  - Important capability already present: `refreshIdentity()` updates pending local events after token/session changes.

- [`microboard/src/Events/Log/EventsLog.ts`](/home/alex/github/hyperboard/microboard/src/Events/Log/EventsLog.ts)
  - Owns confirmed/new/to-send event records, pending publish state, snapshot generation, resend state.
  - Reusable for local MCP: **yes**.
  - This is the main existing base for reconnect-safe local mutation buffering.

- [`microboard/src/Events/MessageRouter/messageRouter.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/messageRouter.ts)
- [`microboard/src/Events/MessageRouter/createMessageRouter.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/createMessageRouter.ts)
- [`microboard/src/Events/MessageRouter/handleBoardSubscriptionCompletedMsg.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleBoardSubscriptionCompletedMsg.ts)
- [`microboard/src/Events/MessageRouter/handleBoardEventMessage.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleBoardEventMessage.ts)
- [`microboard/src/Events/MessageRouter/handleConfirmation.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleConfirmation.ts)
- [`microboard/src/Events/MessageRouter/handleCreateSnapshotRequestMessage.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleCreateSnapshotRequestMessage.ts)
  - These apply validated transport messages into board state and log state.
  - Reusable for local MCP: **yes**.
  - Refactor needed: **yes**.
  - Main issue: several handlers still reach through global UI assumptions:
    - `conf.connection.send(...)`
    - `conf.connection.notifyAboutLostConnection()`
    - `window.location.search` focus behavior in board subscription completion
  - The routing and normalization logic are good candidates to keep in core, but the user-facing side effects should move behind injectable policies.

- [`microboard/src/protocol.ts`](/home/alex/github/hyperboard/microboard/src/protocol.ts)
- [`microboard/src/Events/MessageRouter/socketContract.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/socketContract.ts)
- [`microboard/docs/protocol-ui-agent-guide.md`](/home/alex/github/hyperboard/microboard/docs/protocol-ui-agent-guide.md)
- [`microboard/docs/protocol-server-agent-guide.md`](/home/alex/github/hyperboard/microboard/docs/protocol-server-agent-guide.md)
  - Public websocket and handshake schema surface.
  - Reusable for local MCP: **yes, strongly**.
  - This should remain the public protocol layer used by any future local runtime.

### Auth and session handling

- [`microboard/src/Settings.ts`](/home/alex/github/hyperboard/microboard/src/Settings.ts)
  - Defines the `Connection` interface and auth hooks like `getAccessToken`, `onAuthInvalid`, `onAuthTerminalFailure`.
  - Reusable for local MCP: **partly**.
  - Current role: integration seam, not a real runtime.
  - Problem: it is a large global mutable singleton that mixes rendering, auth, i18n, notifications, DOM, and connection state.

- [`microboard/src/api/AuthRequest.ts`](/home/alex/github/hyperboard/microboard/src/api/AuthRequest.ts)
  - Universal authenticated fetch wrapper with one retry after `AUTH_INVALID_ACCESS_TOKEN`.
  - Reusable for local MCP: **yes**, but not enough on its own.
  - Missing pieces for local MCP:
    - token persistence
    - deduplicated refresh ownership beyond the UI hook
    - websocket refresh/reconnect orchestration

- [`microboardUI/src/entities/account/Account.ts`](/home/alex/github/hyperboard/microboardUI/src/entities/account/Account.ts)
  - Owns real access-token state, deduplicated refresh promise, login/logout, account fetching, session-expired behavior.
  - Reusable as-is for local MCP: **no**.
  - This is browser-app code, but it contains the **actual runtime behavior** the local MCP package will need in headless form.

- [`microboardUI/src/App/Connection.ts`](/home/alex/github/hyperboard/microboardUI/src/App/Connection.ts)
  - Owns board connect handshake, websocket client, anonymous fallback, session identity adoption, reconnect behavior, lost-connection notifications.
  - Reusable as-is for local MCP: **no**.
  - Architecturally very important because it shows current backend expectations and reconnect rules.
  - This is the strongest candidate for extraction into a shared headless runtime package.

- [`microboardServerless/docs/core-ui-auth-websocket-handoff.md`](/home/alex/github/hyperboard/microboardServerless/docs/core-ui-auth-websocket-handoff.md)
  - Documents the current auth and reconnect contract.
  - Very relevant for local MCP design.

### Board read APIs and indexing

- [`microboard/src/SpatialIndex/SpacialIndex.ts`](/home/alex/github/hyperboard/microboard/src/SpatialIndex/SpacialIndex.ts)
  - Provides item lookup, point/rect queries, in-view queries, grouped item lookup, copy/snapshot traversal.
  - Reusable for local MCP: **yes**.
  - Strong source for read-side agent APIs:
    - `listAll`
    - `getById`
    - `getItemsInView`
    - `getFilteredMbr`
    - `listEnclosedBy`
    - `listEnclosedOrCrossedBy`

- [`microboard/src/Selection/Selection.ts`](/home/alex/github/hyperboard/microboard/src/Selection/Selection.ts)
  - Owns selected items, selection hierarchy, batch item operations, locking, duplicate, z-order commands, rich text editing focus, and many UI-heavy edit flows.
  - Reusable for local MCP: **partly**.
  - Good reusable pieces:
    - selection list / MBR
    - hierarchy helpers
    - batch commands like lock/unlock/bringToFront/sendToBack/duplicate
  - Not suitable to expose directly for headless agents because it also owns text-focus and UI interaction flows.

### Serialization and snapshots

- [`microboard/src/Board.ts`](/home/alex/github/hyperboard/microboard/src/Board.ts)
  - `serialize()`, `deserialize()`, `serializeHTML()`, `deserializeHTML()`, `getSnapshot()`.
  - Reusable for local MCP: **yes**.
  - Good foundations for:
    - board export
    - snapshot-based inspection
    - checkpointing

- [`microboard/src/HTMLAdapter/BoardHTMLAdapter.ts`](/home/alex/github/hyperboard/microboard/src/HTMLAdapter/BoardHTMLAdapter.ts)
- [`microboard/src/HTMLAdapter/Parser.ts`](/home/alex/github/hyperboard/microboard/src/HTMLAdapter/Parser.ts)
  - HTML serialization/deserialization of board content.
  - Reusable for local MCP: **yes**, but some export flows are browser-coupled.

- [`WebComponentJSONCodec`](/home/alex/github/hyperboard/WebComponentJSONCodec)
- [`Canvas2DGeometryIR`](/home/alex/github/hyperboard/Canvas2DGeometryIR)
  - Portable document/geometry helpers.
  - Useful for future exports or summaries.
  - Not central to local MCP session lifecycle.

### Node-compatible runtime support

- [`microboard/src/node.ts`](/home/alex/github/hyperboard/microboard/src/node.ts)
- [`microboard/src/api/initNodeSettings.ts`](/home/alex/github/hyperboard/microboard/src/api/initNodeSettings.ts)
- [`microboard/src/api/NodeDocumentFactory.ts`](/home/alex/github/hyperboard/microboard/src/api/NodeDocumentFactory.ts)
- [`microboard/src/api/NodeDOMParser.ts`](/home/alex/github/hyperboard/microboard/src/api/NodeDOMParser.ts)
- [`microboard/package.json`](/home/alex/github/hyperboard/microboard/package.json)
  - Node entrypoint exists and configures DOM/path abstractions.
  - Reusable for local MCP: **yes**.
  - Important note: `jsdom` and `canvas` are peer dependencies, so the runtime already expects optional Node support packages.

## 3. Proposed Local MCP Runtime Architecture

### Recommended package split

#### Keep inside `microboard`

- `Board`, `Events`, `EventsLog`, `messageRouter`, protocol schemas
- serialization, snapshots, item registry, operation system
- Node/browser settings initialization
- pure board read/write primitives

#### New shared runtime package

Suggested package name:

- `microboard-runtime`

This package should own the reusable headless client runtime needed by both:

- a future local MCP server/package
- any future CLI/headless automation client

It should contain:

- `SessionManager`
- `ConnectionManager`
- `BoardSessionClient` or `BoardAgentRuntime`
- token store abstractions
- websocket client abstraction
- connect-handshake client

#### Future local MCP package

Suggested package name:

- `microboard-mcp-local`

It should contain only:

- MCP transport/bootstrap
- tool schema registration
- mapping MCP tool calls to runtime methods
- MCP-specific streaming/result formatting

It should **not** own:

- websocket protocol logic
- board reconnect logic
- token refresh rules
- semantic board operations

### Runtime components

#### `SessionManager`

Responsibilities:

- browser-based login bootstrap
- local token persistence
- current auth state
- access-token expiry tracking
- refresh flow
- terminal session failure handling

Where it should live:

- `microboard-runtime`

Why not in `microboard`:

- auth persistence and login bootstrap are not intrinsic board-model concerns
- this logic is app/runtime specific, not board-engine specific

Design notes:

- expose a transport-neutral API:
  - `loginInteractive()`
  - `getAccessToken()`
  - `refreshIfNeeded()`
  - `refreshNow()`
  - `logout()`
  - `getSessionState()`
- depend on injected `TokenStore`
- depend on injected `AuthApiClient`

#### `ConnectionManager`

Responsibilities:

- call backend connect endpoint
- open websocket with returned `wsUrl` and short-lived `jwt`
- track current board/session identity
- reconnect after disconnect or token refresh
- restore subscriptions and board state

Where it should live:

- `microboard-runtime`

Design notes:

- should encapsulate the logic currently scattered in [`microboardUI/src/App/Connection.ts`](/home/alex/github/hyperboard/microboardUI/src/App/Connection.ts)
- should reuse:
  - `microboard/protocol`
  - `messageRouter.handleMessage(...)`
  - `board.events.refreshIdentity()`

#### `BoardAgentRuntime`

Responsibilities:

- stable high-level API for agents
- manage one or more open board sessions
- wrap raw board + connection primitives
- expose semantic operations and safe reads

Where it should live:

- `microboard-runtime`

This is the key abstraction for future MCP:

- MCP tools call `BoardAgentRuntime`
- `BoardAgentRuntime` calls `ConnectionManager`, `Board`, `Events`, and item APIs

#### MCP adapter layer

Responsibilities:

- register MCP tool names and schemas
- convert MCP inputs to runtime method calls
- format outputs for MCP
- handle MCP progress/streaming

Where it should live:

- `microboard-mcp-local`

Thinness rule:

- if a capability is useful outside MCP, it belongs in `microboard-runtime`, not the adapter

## 4. Recommended Public/Runtime API For Agent Integrations

The API should be semantic and stable. It should not expose raw websocket messages, raw operations, or `conf.connection`.

### Session/runtime lifecycle

- `loginInteractive(): Promise<SessionInfo>`
  - Opens browser auth flow and stores resulting credentials.
  - Async.
  - Runtime level because MCP clients need explicit login bootstrap.

- `logout(): Promise<void>`
  - Clears token store and drops active connections.
  - Async.

- `connectBoard(boardId: string, options?): Promise<BoardHandle>`
  - Performs handshake, websocket connect, board subscription, and snapshot/bootstrap.
  - Async.

- `disconnectBoard(boardId: string): Promise<void>`
  - Closes board session cleanly.
  - Async.

- `listOpenBoards(): BoardSessionSummary[]`
  - Synchronous runtime state query.

### Read operations

- `getBoardSummary(boardId): Promise<BoardSummary>`
  - Includes mode, item counts, frame counts, selection ids, last synced order.
  - Reuses `Board`, `SpatialIndex`, `EventsLog`.
  - Async only because the board may need to be opened first.

- `getBoardSnapshot(boardId, format?: "json" | "html"): Promise<...>`
  - Reuses `board.getSnapshot()`, `serialize()`, `serializeHTML()`.
  - Good export boundary.

- `listItems(boardId, filter?): Promise<ItemSummary[]>`
  - Reuses `board.items.listAll()`.
  - Should return compact normalized summaries rather than raw class instances.

- `getItem(boardId, itemId): Promise<ItemDetail | null>`
  - Reuses `board.items.getById()`.
  - Should include item type, transform, parent/children ids, selected state, key semantic fields.

- `getVisibleItems(boardId): Promise<ItemSummary[]>`
  - Reuses `board.items.getItemsInView()`.
  - Useful for viewport-local agent operations.

- `getSelection(boardId): Promise<SelectionSummary>`
  - Reuses `board.selection.list()` and `getMbr()`.

- `getHierarchy(boardId, itemIds?): Promise<HierarchyNode[]>`
  - Reuses selection hierarchy helpers and parent/child relationships in item/index state.

- `watchBoard(boardId, options?): AsyncIterable<BoardEventSummary>`
  - Optional.
  - Useful later for event-driven tools.
  - Should stream normalized semantic events, not raw socket messages.

### Mutation operations

- `createItems(boardId, specs: CreateItemSpec[]): Promise<CreateItemsResult>`
  - Reuses `board.createItemAndAdd(...)`.
  - Should validate supported item types and high-level properties.
  - Async because confirmation/sync may matter.

- `updateItems(boardId, patches: UpdateItemPatch[]): Promise<MutationResult>`
  - Reuses item-specific ops + `propertyOps` where safe.
  - Should validate allowed fields per item type.
  - Avoid generic unrestricted property mutation in the public surface.

- `moveItems(boardId, ids, delta | absolute): Promise<MutationResult>`
  - Reuses `transformOps.translateBy/translateTo`.

- `resizeItems(boardId, ids, spec): Promise<MutationResult>`
  - Reuses transformation helpers, but runtime should own semantic validation.

- `rotateItems(boardId, ids, degrees): Promise<MutationResult>`
  - Reuses `transformOps.rotateBy/rotateTo`.

- `groupItems(boardId, ids): Promise<{ groupId: string }>`
  - Reuses `board.group(...)`.

- `ungroupItems(boardId, ids): Promise<MutationResult>`
  - Reuses `board.ungroup(...)`.

- `deleteItems(boardId, ids): Promise<MutationResult>`
  - Reuses `board.remove(...)`.

- `setZOrder(boardId, ids, action: "front" | "back"): Promise<MutationResult>`
  - Reuses `board.bringToFront(...)` / `board.sendToBack(...)`.

- `lockItems(boardId, ids, locked: boolean): Promise<MutationResult>`
  - Reuses selection/board lock operations.

- `batch(boardId, fn | operations): Promise<BatchResult>`
  - Important for multi-step agent actions.
  - Runtime should provide one semantic batching API even if internally it emits several operations.

### Safety boundaries

Recommended runtime safety rules:

- no raw arbitrary operation injection in public agent API initially
- no direct access to `propertyOps.setProperty(...)` without allowlists
- item-type-specific validation on create/update
- default to high-level semantic mutations
- optionally support read-only mode per board session
- optionally support mutation policies:
  - `read-only`
  - `safe-edit`
  - `full-edit`

## 5. Auth + WebSocket Lifecycle Design

### What the repository already supports

Existing support today:

- authenticated request retry:
  - [`microboard/src/api/AuthRequest.ts`](/home/alex/github/hyperboard/microboard/src/api/AuthRequest.ts)
- deduplicated token refresh:
  - [`microboardUI/src/entities/account/Account.ts`](/home/alex/github/hyperboard/microboardUI/src/entities/account/Account.ts)
- board connect handshake + websocket startup:
  - [`microboardUI/src/App/Connection.ts`](/home/alex/github/hyperboard/microboardUI/src/App/Connection.ts)
- session identity refresh for pending local events:
  - [`microboard/src/Events/Events.ts`](/home/alex/github/hyperboard/microboard/src/Events/Events.ts)
  - [`microboard/src/Events/Log/EventsLog.ts`](/home/alex/github/hyperboard/microboard/src/Events/Log/EventsLog.ts)
- reconnect contract and anonymous fallback guidance:
  - [`microboardServerless/docs/core-ui-auth-websocket-handoff.md`](/home/alex/github/hyperboard/microboardServerless/docs/core-ui-auth-websocket-handoff.md)

### Recommended headless flow

#### Initial login

1. `SessionManager.loginInteractive()` starts local login.
2. It opens the browser to the auth entrypoint.
3. Local callback or polling flow obtains tokens.
4. Tokens are stored in local persistent storage.
5. `SessionManager` records:
   - access token
   - refresh token or refresh-cookie-backed state descriptor
   - expiry timestamps
   - authenticated user metadata if available

What is missing in repo today:

- a headless local login bootstrap owned outside the browser UI
- a portable token persistence abstraction

#### Token storage

Recommended abstraction:

- `TokenStore`
  - `read()`
  - `write(tokens)`
  - `clear()`

Implementation should live in local runtime / local MCP package, not in `microboard`.

#### Access-token expiry and proactive refresh

Recommended behavior:

1. Parse access token expiry if encoded, or store `expiresAt` from login/refresh response.
2. Refresh proactively before expiry with a short skew, for example 60 seconds.
3. Also refresh reactively on:
   - HTTP `AUTH_INVALID_ACCESS_TOKEN`
   - connect-handshake invalid-token response

This logic should be centralized in `SessionManager`, not scattered across fetch and websocket code.

#### WebSocket connect

1. `ConnectionManager.connectBoard(boardId)` asks `SessionManager` for a valid access token.
2. It calls the backend connect endpoint.
3. It validates response using `microboard/protocol`.
4. It adopts returned transport identity:
   - `sessionId`
   - `authorUserId`
5. It opens websocket using returned short-lived JWT.
6. Incoming messages are decoded and routed through `messageRouter.handleMessage(...)`.

#### Reconnect after refresh or disconnect

1. If socket drops:
   - mark board session as reconnecting
   - keep local board state and pending log
2. If access token is stale:
   - `SessionManager.refreshNow()`
3. After refresh:
   - reconnect via connect endpoint
   - update transport identity
   - call `board.events.refreshIdentity()`
4. Resubscribe/open board session again
5. Let `BoardSubscriptionCompleted` restore current sequence, snapshot, and missing events

#### Restoring board state after reconnect

This is already mostly supported by:

- `handleBoardSubscriptionCompletedMsg(...)`
- `EventsLog` sequence/pending state
- snapshot + event replay

What should be added:

- remove UI-only side effects from subscription handling
- make board-load focus/viewport behavior optional policies, not unconditional browser behavior

### Failure cases

#### Refresh failure

Desired behavior:

- clear local auth state
- close authenticated sockets
- mark session expired
- local MCP should return a structured auth error and require re-login

For local MCP, anonymous board fallback is optional and should be explicit.
Do not assume local MCP should silently downgrade to anonymous unless the runtime is configured to allow it.

#### Expired session

- same as refresh failure
- runtime should expose a terminal state like `auth_expired`

#### Network loss

- keep board instance and local event log
- reconnect with backoff
- do not discard pending operations

#### Reconnect races

Needed runtime rule:

- one reconnect per board session at a time
- one refresh per session manager at a time

This already exists conceptually for refresh in UI `Account`, but needs to be extracted.

#### In-flight mutations during reconnect

Current core behavior is favorable:

- new local events are stored in `EventsLog`
- pending identity can be refreshed with `refreshIdentity()`

Needed addition:

- explicit runtime session states to prevent overlapping connect/resubscribe attempts

## 6. Required Refactors

### A. Separate headless-safe connection hooks from UI hooks

Current issue:

- [`microboard/src/Settings.ts`](/home/alex/github/hyperboard/microboard/src/Settings.ts) mixes:
  - connection transport
  - notifications
  - modal hooks
  - DOM helpers
  - React editor hooks
  - auth callbacks

Recommended refactor:

- keep rendering/platform config in `conf`
- move session/connection runtime ownership out of `conf`
- pass actual runtime connection objects into board/session APIs rather than relying on one global `conf.connection`

### B. Remove browser-only side effects from message handlers

Current issue:

- [`microboard/src/Events/MessageRouter/handleBoardSubscriptionCompletedMsg.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleBoardSubscriptionCompletedMsg.ts) uses:
  - `window.location.search`
  - camera auto-focus behavior tied to browser route state
- other handlers call `conf.connection` for UX notifications

Recommended refactor:

- keep pure board-sync application in core
- move focus/notification side effects behind optional callbacks or runtime policies

### C. Extract shared headless auth and websocket runtime from UI

Current issue:

- actual lifecycle logic is trapped in browser app code

Recommended refactor:

- extract logic from:
  - [`microboardUI/src/App/Connection.ts`](/home/alex/github/hyperboard/microboardUI/src/App/Connection.ts)
  - [`microboardUI/src/entities/account/Account.ts`](/home/alex/github/hyperboard/microboardUI/src/entities/account/Account.ts)
- create transport-neutral modules in `microboard-runtime`

### D. Introduce a runtime-facing board API facade

Current issue:

- `Board` is rich but too broad and partially UI-oriented

Recommended refactor:

- add `BoardAgentRuntime` in the shared runtime package
- optionally add a smaller normalized read API in `microboard` for item summaries/snapshots if repeated adapters need it

### E. Reduce browser-only persistence inside `Board`

Current issue:

- snapshot cache and camera cache use `localStorage`/`indexedDB` in `Board`

Recommended refactor:

- move persistence into injected storage adapters or optional helper modules
- keep `Board` focused on in-memory state + serialization

### F. Stabilize item creation/update contracts

Current issue:

- item creation still has legacy assumptions
- see [`microboard/docs/item-api-next-steps.md`](/home/alex/github/hyperboard/microboard/docs/item-api-next-steps.md)

Recommended refactor:

- add stable creation helpers before exposing create/update to agents broadly
- this reduces risk in `createItems` and `updateItems`

## 7. Staged Implementation Plan

### Stage 1. Document and isolate the current seam

Goal:

- make core sync reusable without browser-side effects

Affected modules:

- [`microboard/src/Events/MessageRouter/handleBoardSubscriptionCompletedMsg.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleBoardSubscriptionCompletedMsg.ts)
- [`microboard/src/Events/MessageRouter/handleConfirmation.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/handleConfirmation.ts)
- [`microboard/src/Settings.ts`](/home/alex/github/hyperboard/microboard/src/Settings.ts)

Refactor:

- split pure sync application from UI policy callbacks
- remove unconditional `window`/notification coupling from message handlers

Expected result:

- board sync can run headlessly without pretending to be a browser app

Risks:

- browser app may rely on implicit camera/focus behavior

### Stage 2. Extract auth/session logic into `microboard-runtime`

Goal:

- create reusable headless session management

Affected source inspirations:

- [`microboardUI/src/entities/account/Account.ts`](/home/alex/github/hyperboard/microboardUI/src/entities/account/Account.ts)
- [`microboard/src/api/AuthRequest.ts`](/home/alex/github/hyperboard/microboard/src/api/AuthRequest.ts)

New abstractions:

- `TokenStore`
- `AuthApiClient`
- `SessionManager`

Expected result:

- one place for token state, expiry, refresh, and logout

Risks:

- browser-cookie-based refresh may need a local callback or sidecar flow decision

### Stage 3. Extract websocket and board-connect runtime

Goal:

- move board connect/reconnect/session restore out of UI

Affected source inspirations:

- [`microboardUI/src/App/Connection.ts`](/home/alex/github/hyperboard/microboardUI/src/App/Connection.ts)
- [`microboard/src/Events/MessageRouter/messageRouter.ts`](/home/alex/github/hyperboard/microboard/src/Events/MessageRouter/messageRouter.ts)

New abstractions:

- `WebSocketClient`
- `ConnectApiClient`
- `ConnectionManager`
- `BoardSession`

Expected result:

- headless Node/Bun client can open and maintain board sessions

Risks:

- connect endpoint behavior for anonymous/public boards needs a clear product decision for local MCP

### Stage 4. Add `BoardAgentRuntime`

Goal:

- expose stable semantic board operations for agents

Affected modules:

- new runtime package
- optionally small helper additions in `microboard`

Refactor:

- wrap `Board`, `Selection`, `SpatialIndex`, `transformOps`, snapshots
- expose normalized item summaries and safe mutations

Expected result:

- MCP adapter no longer needs to understand raw operations or item internals

Risks:

- item-specific update surface needs careful allowlisting

### Stage 5. Build thin `microboard-mcp-local`

Goal:

- expose runtime through MCP without polluting core packages

Affected modules:

- new local MCP package only

Refactor:

- register MCP tools
- map tool handlers to `BoardAgentRuntime`

Expected result:

- reusable local MCP with minimal duplication

Risks:

- vendor-specific tool naming or streaming can stay isolated here

## 8. Open Questions / Risks

- Login bootstrap for local MCP is not yet specified.
  - Best candidate is browser-based login with local callback or device-style flow.
  - This belongs in runtime/MCP package design, not `microboard` core.

- Refresh mechanism may depend on current browser-cookie assumptions.
  - If backend refresh is cookie-bound, a pure local Node/Bun client may need a small local auth bridge or explicit refresh-token transport decision.

- `Board` still contains browser persistence and viewport behavior.
  - Headless use is already possible in large parts, but not yet cleanly separated.

- Rich text and some item modules still pull in React/DOM assumptions.
  - `microboard` supports Node initialization, but a fully headless agent runtime should avoid UI editing paths and use snapshot/operation-level updates instead.

- Exposing generic raw operations to agents would be fast but fragile.
  - Recommended to avoid that first and ship semantic APIs instead.

- The current `Connection` type in [`microboard/src/Settings.ts`](/home/alex/github/hyperboard/microboard/src/Settings.ts) is too UI-leaning for a long-term runtime boundary.
  - It is good enough as an integration seam today, but not ideal as the permanent public runtime contract.

## Recommended Next Move

The lowest-risk next implementation step is:

1. make the message-router subscription/confirmation flow headless-safe
2. extract `SessionManager` and `ConnectionManager` into a new shared runtime package
3. add `BoardAgentRuntime` on top of existing `Board` APIs
4. only then build the local MCP adapter

That keeps MCP thin, preserves browser app behavior, and maximizes reuse across Node.js, Bun, backend jobs, and future local agent integrations.
