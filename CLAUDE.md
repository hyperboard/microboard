# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
bun install

# Build all bundles (ESM + CJS for browser and node, CSS, TypeScript declarations)
bun run build

# Run tests
bun test

# Run a single test file
bun test src/Events/Transform/Transform.test.ts

# Lint
eslint src/**/*.{ts,tsx}

# Watch mode (browser ESM only, no CSS/types)
bun run dev

# Clean dist
bun run clean
```

## Architecture

**Microboard** is a framework-agnostic interactive whiteboard library. It has two entry points: `src/browser.ts` (initializes browser-specific factories) and `src/node.ts` (initializes Node.js-specific factories). Both re-export everything from `src/index.ts`.

### Core Data Flow

All state mutations go through `Operation` objects. The flow is:

1. User interaction (Tool or direct API call) → creates an `Operation`
2. `item.emit(operation)` or `events.applyAndEmit(operation)` → dispatches it
3. `Events` class logs the operation and publishes to subscribers
4. `Subject<BoardEvent>` notifies all observers (canvas re-render, collaboration sync, etc.)

Operations are reversible — undo/redo works by replaying the log.

### Key Classes

**`Board`** (`src/Board.ts`) — The central class. Owns all subsystems: `events`, `selection`, `tools`, `pointer`, `camera`, `items` (SpatialIndex). Instantiate this to create a whiteboard.

**`BaseItem`** (`src/Items/BaseItem/BaseItem.ts`) — Base class for all board items. Extends `Mbr` (minimum bounding rectangle) and implements `Geometry`. Every item has:
- `transformation: Transformation` — position/scale/rotation via affine matrix
- `linkTo: LinkTo` — optional hyperlink
- `serialize()` / `deserialize()` — persistence
- `emit(operation)` — dispatches an operation through `Board.events`
- Optional `index: SimpleSpatialIndex` — for container items (Frame, Group) that hold children

**`Events`** (`src/Events/Events.ts`) — Manages operation log, undo/redo, and collaboration ordering. The `Log/` subdirectory handles the ordered event list; `Transform/` handles OT (operational transformation) for concurrent edits on rich text.

**`Subject<T>`** (`src/Subject.ts`) — Simple observer pattern implementation used throughout for reactive updates.

**`conf`** (`src/Settings.ts`) — Global settings object. Must be configured before use. Key fields:
- `conf.connection` — implement the `Connection` interface for real-time collaboration
- `conf.path2DFactory` — platform-specific Path2D (auto-detected)
- `conf.documentFactory` — platform-specific DOM factory
- `conf.getAccessToken`, `conf.notify`, `conf.openModal` — app integration hooks

### Item System

Items live in `src/Items/`. Built-in types: Shape, Sticker, RichText, Connector, Drawing, Image, Video, Audio, Frame, Group, Comment, AINode, Arc, Line, Path, Placeholder.

To add a custom item type, call `registerItem({ item: MyItemClass, defaultData: { itemType: "MyItem", ... }, toolData?: ... })` from `src/Items/RegisterItem.ts`. This registers the factory, validator, and optionally a tool.

### Platform Abstraction

`src/api/` contains browser vs. node adapters:
- `BrowserPath2DFactory` / `NodePath2DFactory` / `MockPath2D`
- `BrowserDocumentFactory` / `NodeDocumentFactory` / `MockDocumentFactory`
- `BrowserDOMParser` / `NodeDOMParser`
- `initBrowserSettings.ts` / `initNodeSettings.ts` wire these into `conf`

### TypeScript Path Aliases

`tsconfig.json` sets `baseUrl: "src"` with path mappings so imports like `import { Camera } from "Camera"` resolve to `src/Camera/`. The same aliases apply in all source files.

### Build Output

`bun run build.ts` produces:
- `dist/esm/{browser,node,index}.js` — ESM
- `dist/cjs/{browser,node,index}.js` — CJS
- `dist/types/` — TypeScript declarations (via `tsc --emitDeclarationOnly` + `tsc-alias`)
- `dist/microboard.css` — all CSS files bundled via Lightning CSS

External peer dependencies (`canvas`, `jsdom`, `slate`, `slate-react`) are excluded from all bundles.

### Tests

Test files are co-located with source as `*.test.ts`. The bulk of tests are in `src/Events/Transform/` covering operational transformation edge cases for collaborative rich text editing.
