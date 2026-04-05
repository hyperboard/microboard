# UI Handout: Overlay Metadata Contract After Alignment Pass Two

## Purpose

This is the practical contract the UI should implement against in this phase.

Core metadata now intentionally covers:

- tool entries
- item actions
- editor/input semantics
- semantic grouping
- action invocation mapping
- dynamic option providers
- plugin-owned selection actions
- selection intersection
- single-selection gating through action `target`

Core metadata intentionally does **not** cover:

- toolbar launcher wrappers
- submenu structure
- row placement / layout rules
- popover layout
- modal orchestration
- async picker UX
- value-dependent hidden/disabled predicates

## Where Metadata Comes From

Exports come from [src/Overlay/index.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/index.ts).

Use:

- `listToolOverlays()`
- `getToolOverlay(toolName)`
- `getItemOverlay(itemOrType)`
- `intersectOverlayActions(items)`
- `getSelectionOverlayActions(items)`
- `resolveDynamicOptions(providerId, context)`

Items also expose:

- `item.getOverlay()`

## Tool Metadata

Each toolbar-capable tool exposes:

- `toolName`
- `label`
- `kind`: `mode | create`
- `family`
- `icon`
- optional `createsItemType`
- optional `defaults`

Current tools with overlay metadata:

- `AddDrawing`
- `AddHighlighter`
- `Eraser`
- `AddShape`
- `AddConnector`
- `AddSticker`
- `AddFrame`
- `AddText`
- `AddDice`
- `AddScreen`
- `AddPouch`

Important UI rule:

- Core describes tools individually.
- Core does not describe launcher tools like the current drawing launcher or game-item submenu.
- If the UI wants grouped launchers, that grouping is UI-owned.

## Item Action Metadata

Each item overlay exposes `actions[]`.

Action fields:

- `id`
- `label`
- `icon`
- `target`: `single | each | selection`
- optional `description`
- optional `invoke`
- optional `controls`
- optional `groups`

### Action target semantics

`target` is now part of the runtime contract, not just descriptive text.

- `single`: valid only when exactly one selected item participates
- `each`: valid for one or many selected items and applies per item
- `selection`: valid for the current selection as a whole

`intersectOverlayActions(items)` now filters `target: "single"` actions out of multi-selection results.

This is the supported selection-cardinality mechanism for this phase.

## Selection Actions

Selection actions are plugin-owned actions that apply to the current selection as a whole.

Use:

- `getSelectionOverlayActions(items)`

Current selection action:

- `deck.createFromSelection`

Semantics:

- selected `Card` items can be stacked into a new `Deck`
- selected `Card` and `Deck` items can be merged into one `Deck`

Hidden cases:

- empty selection
- a single selected deck
- selections containing non-card/deck items

## Supported Editor Types

The UI should support these editor kinds:

- `color`
- `enum-icon`
- `enum-list`
- `number`
- `number-stepper`
- `slider`
- `toggle`
- `dynamic-options`
- `catalog`

### `toggle`

`toggle` is now first-class and is the preferred boolean editor.

Current use:

- connector `smartJump`
- connector tool default `smartJump`

Minimal rendering expectation:

- boolean on/off control
- may use `trueLabel` / `falseLabel` when present

## Supported Icon Types

This phase uses a hybrid icon contract:

- `symbol`
- `asset`

Not supported in this phase:

- inline `svg`
- `state.tint`

### `symbol`

Use existing symbol-key rendering where the UI already supports it.

### `asset`

Use plugin-owned SVG asset files referenced by metadata.

Current practical asset usage:

- shape picker inline and catalog icons

### Dynamic icon state

Supported hint:

- `icon.state.swatch`

Not supported in this phase:

- `icon.state.tint`

Treat `state.swatch` as a rendering hint, not a mandate. The UI may show a swatch, accent, or secondary color chip.

## Selection Behavior Rules

Use `intersectOverlayActions(items)` for the default action set.

Expected behavior:

- same-type selection: common actions survive
- mixed selection: only shared `action.id` values survive
- any action with `target: "single"` disappears when more than one item is selected

What the UI should **not** expect:

- core does not provide a general hidden/disabled predicate language
- core does not provide type-rule exceptions like "show card action when first selected item is X"

## Dynamic Options

Dynamic options resolve through:

- `resolveDynamicOptions(providerId, context)`

Current provider:

- `deck.drawCount`

Current expectation:

- pass the current item/selection context
- render the returned options with the editor’s requested presentation

## Current Action Surface

### Shape

- `shape.shapeType`
- `shape.fill`
- `shape.strokeStyle`

### Connector

- `connector.switchPointers`
- `connector.style`

`connector.style` includes:

- line color
- line type
- line width
- pattern
- start arrow
- end arrow
- smart jump

### RichText

- `text.fontSize`

### Dice

- `dice.throw`
- `dice.range`
- `dice.fill`

### Deck

- `deck.getTopCard`
- `deck.getBottomCard`
- `deck.getRandomCard`
- `deck.getCards`
- `deck.shuffle`
- `deck.flip`

### Selection

- `deck.createFromSelection`

### Screen

- `screen.background`

### Card

- `card.flip`
- `card.rotateCcw`
- `card.rotateCw`

## Practical UI Simplifications Expected In This Phase

These are intentional simplifications, not missing core features:

- render `AddDrawing`, `AddHighlighter`, and `Eraser` as separate tool entries unless the UI wants to group them itself
- flatten game-item toolbar entries unless the UI wants to own a submenu
- render connector editing as one grouped editor/popover instead of the current split row
- simplify rich-text font size to a generic stepper/list control
- keep screen background-image flow custom for now
- keep card/deck combined-selection special cases out of the metadata migration

## What UI Must Not Expect From Core

- toolbar grouping / launcher metadata
- submenu metadata
- row decomposition hints
- overflow priority
- modal descriptors
- async file/media picker descriptors
- value-dependent hidden/disabled metadata
- plugin-defined mixed-selection actions beyond plain `action.id` intersection

## After This Pass, What Can Be Rendered Purely From Metadata?

The UI can now implement these behaviors directly from metadata:

- top-level rendering of individual tool entries
- tool default editors
- shape overlay controls
- connector grouped style editing
- connector switch-arrows action
- connector smart-jump toggle
- text font-size editing
- dice throw/range/fill
- deck single-selection actions with proper single-selection gating
- deck creation/merge from card/deck selection
- screen background color
- card flip/rotate
- mixed-selection common-action intersection
- dynamic draw-count options for decks

These behaviors remain intentionally outside the metadata system:

- drawing launcher behavior and last-used-child logic
- game-item submenu structure
- screen background image picker flow
- conditional hiding/disabling based on runtime item state like `backgroundUrl`
- modal and async UX structure
- exact row/inline/popover layout
