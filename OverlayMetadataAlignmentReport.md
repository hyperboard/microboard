# Overlay Metadata Alignment Report: Second Pass

## A. Categorized Gaps

### Must be implemented in core

- Toggle-style boolean editing.
  Reason: this is a real semantic input type, not a layout preference. `ConnectorSmartJump` is the concrete case.

- Explicit connector `switchPointers` action.
  Reason: this is a real existing operation in core and not just UI composition.

- Selection-cardinality gating for item actions.
  Reason: single-item-only actions like deck actions need runtime filtering for metadata-driven UI to stay correct.

- Finalize the icon contract for this phase.
  Reason: the UI cannot implement a half-supported icon union.

- Plugin-owned selection actions.
  Reason: cross-item behaviors like `CreateDeck` are real overlay actions, but they operate on the selection as a whole rather than on one item type.

### Should NOT be implemented in core

- Toolbar launcher/group metadata for drawing and game-item wrappers.
  Reason: these are toolbar-structure concerns. The UI can flatten tools or own grouping itself.

- Connector row decomposition / row-placement hints.
  Reason: this is layout policy, not action semantics.

- Full modal framework.
  Reason: modal orchestration belongs to the UI.

- Generic async file/media picker metadata in this pass.
  Reason: current needs do not justify a cross-cutting picker contract yet.

- General hidden/disabled DSL.
  Reason: this would reintroduce applicability logic in metadata and add UI policy to core.

- Toolbar launcher state like "last used child".
  Reason: UI-owned interaction state.

### True open design problems

- Screen background-image flow.
  The operation exists, but the right metadata model for async picking is still open.

- Wider rich-text action surface.
  Font size is covered, but the rest of the text row still needs explicit product decisions if it should become metadata-driven.

## B. Decisions Made

### 1. Toggle editor

Decision: yes, supported as first-class input.

Minimal form:

- `kind: "toggle"`
- optional `trueLabel`
- optional `falseLabel`

Implemented for connector `smartJump` on both item actions and tool defaults.

### 2. Selection-aware visibility

Decision: yes, but only through action `target`, not through a new predicate DSL.

Direction:

- `target: "single"` now means the action is only valid for exactly one selected item.
- `intersectOverlayActions(items)` enforces that gating.

Why this direction:

- solves the real deck-style problem
- keeps the contract simple
- avoids generic applicability expressions

### 3. Hidden / disabled state

Decision: not added as a general metadata feature in this pass.

Reasoning:

- the concrete need comes mostly from screen background-image UX
- solving that with a generic predicate system would add too much complexity
- the UI can simplify these flows for now

### 4. Selection actions

Decision: yes, supported as a minimal plugin-owned overlay surface.

Direction:

- plugins can register selection actions
- each action carries its own runtime `isAvailable(items)` predicate
- no central applicability DSL is introduced

Implemented first case:

- `deck.createFromSelection`

Semantics:

- selected cards become a new deck, or
- selected cards and decks merge into one deck

### 5. Async / modal actions

Decision: UI-owned flow invoking existing operations.

Direction:

- core continues to expose operations and metadata for synchronous value editing
- async pickers and modal collection remain in the UI layer

Consequence:

- `SetBackgroundImage` is intentionally not generalized into a metadata editor in this phase

### 6. Icon contract

Decision: hybrid.

Supported now:

- `symbol`
- `asset`
- `icon.state.swatch`

Deferred now:

- inline `svg`
- `state.tint`

Why:

- `symbol` keeps compatibility with current UI
- `asset` is already needed for shape metadata
- inline `svg` and tint state are not required to unblock this phase and would leave the UI with a partially-realized contract

### 7. Explicit actions

Implemented:

- `connector.switchPointers`
- `deck.createFromSelection`

Reasoning:

- `switchPointers` is a real existing connector operation
- `CreateDeck` is a selection-composition problem and is now modeled as a plugin-owned selection action instead of an item action

## C. Rejected Features For This Pass

- launcher metadata
- submenu metadata
- layout hints
- modal framework
- async picker framework
- general hidden/disabled predicates
- central applicability logic
- card/deck special-case UI rules in core

## D. Code-Level Changes Implemented

- Added `toggle` to [src/Overlay/OverlayMetadata.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/OverlayMetadata.ts).
- Added minimal selection-action support to [src/Overlay/OverlayMetadata.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/OverlayMetadata.ts) and [src/Overlay/overlayRegistry.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/overlayRegistry.ts).
- Restricted the phase icon contract in [src/Overlay/OverlayMetadata.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/OverlayMetadata.ts) to `symbol` and SVG `asset`, with `state.swatch` only.
- Updated [src/Overlay/overlayRegistry.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/overlayRegistry.ts) so `intersectOverlayActions(items)` filters out `target: "single"` actions during multi-selection.
- Added `connector.switchPointers` and migrated connector `smartJump` to `toggle` in [src/Items/Connector/ConnectorOverlay.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/ConnectorOverlay.ts).
- Added `deck.createFromSelection` in [src/Items/Deck/DeckOverlay.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Deck/DeckOverlay.ts) and routed execution through [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts).

## E. Explicit Answers

### 1. Do we support toggle editor as first-class input?

Yes. Minimal form is `kind: "toggle"` with optional labels.

### 2. Do we support selection-aware visibility?

Yes, but narrowly. We support it through `target` semantics and runtime filtering in `intersectOverlayActions(items)`, not through a generic predicate DSL.

### 3. What is the final icon contract for this phase?

Hybrid:

- support `symbol`
- support SVG `asset`
- support `state.swatch`
- do not support inline `svg`
- do not support `state.tint`

### 4. How are async actions modeled?

UI-owned async flow invoking existing core operations. No new generic async metadata type was added in this phase.

### 5. How should mixed-selection edge cases evolve, specifically Card + Deck?

Implemented direction:

- plugin-owned selection actions

Current concrete action:

- `deck.createFromSelection`

What we are not doing:

- encoding `Card + Deck` special cases as UI type rules

## F. After This Pass

Behaviors now implementable purely from metadata:

- tool listing and defaults for individually-exposed tools
- shape picker, fill, stroke group
- connector grouped style editor
- connector switch-arrows action
- connector smart-jump toggle
- text font-size editing
- dice throw/range/fill
- deck single-selection actions
- deck creation/merge from card/deck selection
- card flip/rotate
- screen background color
- common-action intersection for mixed selections
- dynamic draw-count options

Behaviors intentionally left outside metadata:

- drawing launcher behavior
- game-item submenu behavior
- exact overlay row structure
- modal and async picker UX
- runtime hidden/disabled based on item state
