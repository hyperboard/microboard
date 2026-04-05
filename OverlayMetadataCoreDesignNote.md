# Plugin-Local Overlay Metadata in Core: First Pass

## Summary

This pass replaces the old item-type-specific `ItemActions` direction with a metadata contract that is attached to the existing item/tool registration flow.

The new runtime surface is exported from `src/Overlay/` and is wired through:

- `registerItem(...)`
- `registerTool(...)`
- `BaseItem.getOverlay()`
- `getItemOverlay(...)`
- `getToolOverlay(...)`
- `listToolOverlays()`
- `intersectOverlayActions(items)`
- `getSelectionOverlayActions(items)`
- `resolveDynamicOptions(providerId, context)`

The goal of this pass is not to dictate overlay layout. It only describes:

- what tools exist
- how tools appear in toolbar-like UI
- which item actions exist
- which existing operations / tool state they map to
- which plugin-owned selection actions exist
- how inputs should be edited
- how grouped editors should be presented semantically

## What Changed

### 1. New overlay metadata contract

Added:

- `src/Overlay/OverlayMetadata.ts`
- `src/Overlay/overlayRegistry.ts`
- `src/Overlay/index.ts`

Core types:

- `ToolOverlayDefinition`
- `ItemOverlayDefinition`
- `OverlayActionDefinition`
- `OverlayControlDefinition`
- `OverlayEditor`
- `OverlayIcon`

### 2. Metadata now attaches to existing registrations

`registerItem(...)` now accepts:

- `overlay?: ItemOverlayDefinition`
- `toolData.overlay?: ToolOverlayDefinition`

`registerTool(...)` now accepts:

- `overlay?: ToolOverlayDefinition`

That means metadata stays with the same plugin-local code that already owns:

- item constructors
- tool classes
- item defaults
- operation methods

### 3. Items expose overlay metadata directly

`BaseItem` now has:

- `getOverlay(): ItemOverlayDefinition | undefined`

This keeps selection behavior item-driven instead of UI-driven.

### 4. Mixed-selection intersection is item-driven

Added:

- `intersectOverlayActions(items)`

This intersects by `action.id`, which is the intended action identity.

### 5. Dynamic option spaces are resolver-based

Added:

- `registerDynamicOptionsResolver(...)`
- `resolveDynamicOptions(...)`

This lets plugins define computed option lists without a type-conditional UI DSL.

### 6. Selection actions are plugin-owned

Added:

- `registerSelectionAction(...)`
- `getSelectionOverlayActions(items)`

This lets plugins expose cross-item actions like deck creation/merge without pretending they belong to one item type or introducing a central applicability DSL.

## First-Pass Metadata Implemented

### Tools

Implemented metadata for:

- drawing tool: `AddDrawing`
- highlighter tool: `AddHighlighter`
- eraser tool: `Eraser`
- shape tool: `AddShape`
- connector tool: `AddConnector`
- sticker tool: `AddSticker`
- frame tool: `AddFrame`
- text tool: `AddText`
- dice tool: `AddDice`
- screen tool: `AddScreen`
- pouch tool: `AddPouch`

### Item actions

Implemented metadata for:

- shape type
- shape fill
- shape stroke style group
- connector style group
- rich text font size
- dice throw
- dice range
- deck draw/shuffle/flip operations
- screen background

Also converted `Card` to the same metadata contract so the repo compiles cleanly and the card/deck decision point is explicit in the new model.

### Selection actions

Implemented metadata for:

- deck creation/merge from card/deck selection

## Where Metadata Lives

Tool-local metadata:

- `src/Items/Shape/ShapeOverlay.ts`
- `src/Items/Connector/ConnectorOverlay.ts`
- `src/Items/RichText/RichTextOverlay.ts`
- `src/Items/Drawing/DrawingOverlay.ts`
- `src/Items/Sticker/StickerOverlay.ts`
- `src/Items/Frame/FrameOverlay.ts`
- `src/Items/Dice/DiceOverlay.ts`
- `src/Items/Screen/ScreenOverlay.ts`

Item-local metadata:

- `src/Items/Shape/ShapeOverlay.ts`
- `src/Items/Connector/ConnectorOverlay.ts`
- `src/Items/RichText/RichTextOverlay.ts`
- `src/Items/Dice/DiceOverlay.ts`
- `src/Items/Deck/DeckOverlay.ts`
- `src/Items/Screen/ScreenOverlay.ts`
- `src/Items/Card/CardOverlay.ts`

These are local to the plugin-owned folders and then registered through the existing item/tool registration path.

## Explicit Answers

### 1. How are plugin-defined icons represented?

As a union:

- `kind: "asset"` for plugin-owned asset paths
- `kind: "symbol"` for compatibility with existing UI icon keys

In the aligned second pass, the practical phase contract is:

- `symbol`
- SVG `asset`

Inline metadata `svg` is not part of the supported contract for this phase.

### 2. How can icons reflect dynamic state, like color?

Via `OverlayIcon.state`:

- `state.swatch`

These point at a `toolProperty` or `itemProperty`.

Current examples:

- pen icon can expose pending stroke color
- highlighter icon can expose pending stroke color
- connector icon can expose pending line color
- fill/background icons can expose current item color

This is a hinting contract, not a rendering mandate.

### 3. How does UI determine common actions across selection?

By intersecting item-provided actions by `action.id`.

Core now exports:

- `intersectOverlayActions(items)`

That is the intended default behavior for mixed selections.

### 4. How should mixed-item actions like card/deck be modeled?

Not with type-condition rules in UI.

In the aligned selection-action pass, the chosen direction is:

- a plugin-owned selection action defined by the plugin that owns both item types

Concrete current action:

- `deck.createFromSelection`

That keeps `Deck` item actions focused on existing decks, keeps `Card` item actions focused on cards, and models cross-item deck creation/merge as a true selection-level behavior.

### 5. Where does editor metadata live relative to operation schemas?

Inside overlay control descriptors, adjacent to the operation reference.

Reason:

- existing operation “schemas” in this repo are mostly TypeScript operation types, not runtime schema objects
- we need runtime-inspectable editor metadata now

So the current layering is:

- operation/tool remains the source of truth for behavior
- overlay metadata annotates how UI edits values for that behavior

This avoids duplicating execution logic while still providing inspectable runtime metadata.

### 6. How do tools indicate large option spaces, like catalogs?

Through editor metadata:

- `enum-icon` editor may carry `catalog`
- there is also a standalone `catalog` editor kind

Current concrete example:

- `AddShape` uses `enum-icon` with a small inline set plus a `catalog` containing the larger shape space

## Tradeoffs

- Editor metadata is not embedded inside operation execution code because the current operation definitions are mostly type-only, not runtime objects.
- `symbol` icons remain supported for compatibility, but they are not sufficient alone for future plugin-owned visuals. That is why `asset` is part of the contract now.
- Tool defaults use `toolProperty` references. This is simple and concrete, but it means tools with hidden/nested state may need small proxy properties, as with `AddSticker.backgroundColor`.
- Grouped controls are modeled as action-local `groups`, which is enough for current overlay editors but not yet a full generic layout grammar.

## Limitations and Known Gaps

Not covered in this pass:

- overlay layout policy
- overflow vs inline priority
- disabled/hidden predicates
- async file/media picker flows
- modal-driven actions
- hover overlays
- quick add
- canvas affordances
- transform handles
- hit testing
- drag/drop routing
- runtime execution helpers for `customMethod.args` on the UI side

Notably:

- `Screen` background color is covered
- `Screen` background image/file-picker flow is **not** covered in this pass
- text font size is covered
- richer text formatting clusters are still partial

## Which current UI behaviors are already representable, and which are not yet covered?

Already representable:

- generic toolbar entries from core-owned tool metadata
- tool families and labels
- default editors for tool state
- grouped editors like shape stroke style and connector style
- color picker inputs
- enum icon grids
- enum lists
- number inputs
- number steppers
- sliders
- dynamic option lists
- large catalogs
- plugin-owned icons
- dynamic icon swatch hints
- mixed-selection shared-action intersection by identity
- plugin-owned selection actions like `deck.createFromSelection`

Not yet covered:

- overflow-only actions and priority buckets
- modal/open-editor/file-picker actions
- async upload flows
- disabled/hidden state predicates
- action placement policy
- nested popover semantics
- richer text multi-control grouping beyond font size

## Validation

Validated with:

- `bun run build`

That build completed successfully after wiring all registrations to the new contract.
