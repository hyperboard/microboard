# UI Handout: Reading Overlay Metadata from Core

## Where to Read Metadata

Exports now come from `src/Overlay/`.

The main entry points are:

- `listToolOverlays()`
- `getToolOverlay(toolName)`
- `getItemOverlay(itemOrType)`
- `intersectOverlayActions(items)`
- `resolveDynamicOptions(providerId, context)`

Items also expose:

- `item.getOverlay()`

## Toolbar Metadata

Toolbar-capable tools now expose:

- `toolName`
- `label`
- `kind`
- `family`
- `icon`
- optional `defaults`

Current tools with metadata:

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

### Current tool examples

`AddShape`

- family: `shape`
- default control: shape type
- editor: inline icon enum + catalog

`AddConnector`

- family: `connector`
- defaults: line type, color, width, pattern, start arrow, end arrow, smart jump
- grouped as one connector-defaults cluster

`AddDrawing` / `AddHighlighter`

- family: `drawing`
- defaults: color, width, pattern
- icons expose `state.swatch`

`AddSticker`

- family: `sticker`
- default: background color

`AddFrame`

- family: `frame`
- default: frame type

`AddText`

- family: `text`
- no pre-placement defaults in this pass

## Selection Action Metadata

Each item overlay exposes `actions`.

Action fields:

- `id`
- `label`
- `icon`
- `target`: `single | each | selection`
- optional `invoke`
- optional `controls`
- optional `groups`

### Current item actions

`Shape`

- `shape.shapeType`
- `shape.fill`
- `shape.strokeStyle`

`Connector`

- `connector.style`

`RichText`

- `text.fontSize`

`Dice`

- `dice.throw`
- `dice.range`
- `dice.fill`

`Deck`

- `deck.getTopCard`
- `deck.getBottomCard`
- `deck.getRandomCard`
- `deck.getCards`
- `deck.shuffle`
- `deck.flip`

`Screen`

- `screen.background`

`Card`

- `card.flip`
- `card.rotateCcw`
- `card.rotateCw`

## Input Editors

Supported editor kinds in the current contract:

- `color`
- `enum-icon`
- `enum-list`
- `number`
- `number-stepper`
- `slider`
- `dynamic-options`
- `catalog`

### Grouped controls

Groups are attached directly to actions.

Current grouped actions:

- shape stroke style
- connector style
- drawing defaults
- highlighter defaults

## Icons

Current icon formats:

- `symbol`
- `svg`
- `asset`

### Dynamic icon hints

Icons may include:

- `state.swatch`
- `state.tint`

Current practical examples:

- tool pen/highlighter/connector icons can reflect pending color
- shape/screen fill actions can reflect current item color

Treat these as rendering hints, not strict instructions.

## How to Query Common Actions for Mixed Selection

Use:

- `intersectOverlayActions(items)`

This intersects by `action.id`.

Default expectation:

- same-type selection: you get that type’s common actions
- mixed selection: you get only shared ids

## Dynamic Options

Dynamic option lists resolve through:

- `resolveDynamicOptions(providerId, context)`

Current provider:

- `deck.drawCount`

This computes the draw-count options from the current selected deck size.

## Mappings to Current UI Controls

Already mappable to existing generic controls:

- shape picker with compact row + “more” catalog
- generic color swatch picker
- stroke cluster
- connector style cluster
- numeric stepper for font size
- slider for tool widths
- list/grid pickers for enums
- deck action buttons

## Known Gaps

Still not described by current metadata:

- overflow-vs-inline priority
- disabled state
- hidden state
- async file/media pickers
- modal actions
- nested editor flows
- toolbar active-state derivation beyond icon hints
- quick add
- hover overlays
- canvas affordances

Specific current gap examples:

- `Screen.backgroundUrl` file/media flow is not represented yet
- rich text formatting beyond font size is still partial
- card/deck combined mixed-selection behavior is still a decision point, not a solved contract

## Explicit Answers for UI Work

1. Plugin-defined icons are represented as `svg`, `asset`, or `symbol`.
2. Dynamic icon state is hinted through `icon.state.swatch` or `icon.state.tint`.
3. Common actions are determined by intersecting item-provided `action.id` values.
4. Mixed item actions like `Card + Deck` should be modeled by shared ids, shared capability, or future plugin-owned selection actions, not by UI type rules.
5. Editor metadata currently lives in overlay control descriptors next to operation/tool references because operation schemas are not yet runtime metadata objects.
6. Large tool option spaces are indicated with `catalog`, currently used by the shape tool.
