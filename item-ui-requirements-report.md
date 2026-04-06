# Overlay Metadata Alignment Report

This report answers one consistent question:

- can the current UI preserve its existing overlay behavior using the current core overlay API
- if not, what is missing in core
- if core should not add it, what UI simplification would be acceptable instead

It is not a “blind swap” report. It is a handout to the core repo about what the UI can build with the current API and what the API still needs.

Sources used:

- [OverlayMetadataCoreDesignNote.md](/home/alex/microboard/hyperboard/microboardUI/OverlayMetadataCoreDesignNote.md)
- [OverlayMetadataUIHandout.md](/home/alex/microboard/hyperboard/microboardUI/OverlayMetadataUIHandout.md)
- [ToolsPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/ToolsPanel.tsx#L24)
- [ContextPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/ContextPanel.tsx#L96)

Important implementation note:

- the new overlay API is not consumed in this UI repo yet
- this report is therefore capability validation against real UI behavior

## 1. Executive Summary

The current overlay API is strong enough to support a meaningful first migration of overlay UI, but it is not sufficient to preserve all existing behavior.

What the UI can build with the current API without core changes:

- shape type picker including inline choices plus catalog
- shape fill
- shape stroke style cluster
- sticker default color
- frame type picker
- text font size at a simplified level
- dice throw, range, fill
- single-deck flip, shuffle, top/bottom/random draw
- screen background color
- most current symbol-based icons

What the UI cannot preserve with the current API:

- toolbar launcher/group behavior
- modal toolbar entries
- connector row decomposition
- toggle-style actions like smart jump
- screen background image flow
- selection-cardinality-dependent visibility
- hidden and disabled states
- current card/deck mixed-selection behavior
- metadata-driven rendering of `svg` and `asset` icons

Migration feasibility now:

- feasible for a reduced first pass
- not sufficient for preserving full current behavior

## 2. Toolbar Mapping

Current toolbar structure is defined in [ToolsPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/ToolsPanel.tsx#L48).

### Preservable with current API

`AddShape`

- current UI: main button, inline quick picker, secondary catalog opener [AddShape.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddShape/AddShape.tsx#L13)
- current API support: yes
- why: `enum-icon` plus `catalog` is enough to represent the actual shape choice surface
- possible simplification if desired: catalog may open in a generic popover instead of the current side-panel style

`AddConnector`

- current UI: main button with connector-type picker [AddConnector.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddConnector.tsx#L12)
- current API support: yes
- why: grouped defaults are enough for current tool-default semantics
- possible simplification: expose all connector defaults in one generic grouped popover instead of today’s minimal toolbar picker

`AddSticker`

- current UI: color picker [AddSticker.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddSticker.tsx#L10)
- current API support: yes

`AddFrame`

- current UI: frame type picker [AddFrame.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddFrame.tsx#L10)
- current API support: yes

`AddText`

- current UI: direct tool activation [AddText.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddText.tsx#L8)
- current API support: yes

`AddScreen`

- current UI: direct tool activation inside a submenu [AddScreen.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddGameItem/AddScreen.tsx#L7)
- current API support: tool itself yes
- limitation: current API does not describe the submenu wrapper it lives in

`AddPouch`

- current UI: direct tool activation inside a submenu [AddPouch.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddGameItem/AddPouch.tsx#L7)
- current API support: tool itself yes
- limitation: same submenu-wrapper issue

### Not preservable with current API

`AddDrawing` family launcher

- current UI behavior:
- one top-level button
- child tools are pen, highlighter, eraser
- top-level icon reflects last-used child
- top-level click reactivates last-used child
- child state also drives the color indicator
- file: [AddDrawing.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddDrawing/AddDrawing.tsx#L15)
- current API support: no
- what is missing in core:
- a launcher/group concept for toolbar entries that own child tools
- optional “last used child” identity
- optional launcher icon derivation from active child
- possible UI simplification:
- render `AddDrawing`, `AddHighlighter`, and `Eraser` as three separate toolbar tools
- if that simplification is acceptable, no core addition is required

`AddGameItem` toolbar group

- current UI behavior:
- one parent button opens submenu with `AddDice`, `AddScreen`, `AddPouch`, `AddCard`
- file: [AddGameItem.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddGameItem/AddGameItem.tsx#L13)
- current API support: no
- what is missing in core:
- toolbar grouping/wrapper metadata
- possible UI simplification:
- flatten these tools into top-level toolbar entries
- if flattening is acceptable, core does not need a grouping contract for this case

`AddDice`

- current UI behavior: opens modal, not a placement tool [AddDice.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddGameItem/AddDice.tsx#L12)
- current API support: no
- what is missing in core:
- modal action semantics for toolbar entries
- possible UI simplification:
- replace modal creation flow with a direct tool having defaults in metadata
- if dice creation must stay modal, core needs modal entry/action support

`AddCard`

- current UI behavior: opens modal from the same submenu [AddCard.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ToolsPanel/Buttons/AddGameItem/AddCard.tsx#L12)
- current API support: no
- what is missing in core:
- same modal action semantics as `AddDice`
- possible UI simplification:
- same answer as above

### Toolbar conclusion for core

The missing question is not “can UI render tool metadata”. It can. The missing question is “can core describe launcher/group/modal structure”. Right now the answer is no.

## 3. Context Panel Mapping

### Shape

Current controls:

- `ItemType` [ItemType.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/ItemType/ItemType.tsx#L23)
- `StrokeStyle` [StrokeStyle.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/StrokeStyle/StrokeStyle.tsx#L48)
- conditional `FillStyle` [ContextPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/ContextPanel.tsx#L275)

Supported by current API:

- `shape.shapeType`
- `shape.fill`
- `shape.strokeStyle`

What UI can preserve now:

- shape type picker with inline icons plus catalog
- fill color
- grouped stroke pattern/width/color editing

What is still missing in core:

- nothing strictly required for the basic shape overlay

Potential simplification:

- current UI condition for showing fill is based on first selected item, not true shared capability
- UI can simplify to pure intersection-based behavior and would arguably become more correct

### Connector

Current controls:

- `StartPointer`
- `SwitchPointers`
- `EndPointer`
- `ConnectorType`
- `ConnectorSmartJump`
- `ConnectorLineColor`

Relevant files:

- [StartPointer.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/StartPointer/StartPointer.tsx#L17)
- [EndPointer.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/EndPointer/EndPointer.tsx#L17)
- [SwitchPointers.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/SwitchPointers.tsx#L8)
- [ConnectorType.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/ConnectorType/ConnectorType.tsx#L19)
- [ConnectorSmartJump.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/ConnectorSmartJump.tsx#L8)
- [ConnectorLineColor.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/ConnectorLineColor.tsx#L14)

Supported by current API:

- one grouped `connector.style` action can represent the semantic parameters

What UI can preserve now:

- connector semantics as one grouped editor

What core is missing if current behavior must be preserved:

- action for `switchPointers`
- toggle-style action/editor for `smartJump`
- either:
- support for split presentation of one grouped action across multiple row buttons
- or separate action definitions for start pointer, end pointer, line type, line color, smart jump

Possible UI simplification:

- collapse the current connector row into one grouped popover/editor
- if that simplification is acceptable, core only needs `switchPointers` and `smartJump`

### Text

Current validated requirement:

- `FontSize` [FontSize.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/FontSize/FontSize.tsx#L29)

Supported by current API:

- `text.fontSize`

What UI can preserve now:

- font-size editing

What core is missing if current behavior must be preserved:

- nothing for the basic font-size operation itself

Possible UI simplification:

- the current compound control can simplify to a generic `number-stepper` or `enum-list` based editor
- that would preserve functionality while reducing custom UI behavior

Important wider gap:

- the rest of the text row is not covered by current metadata
- current UI also has font style, alignment, lists, hyperlinks, text color, text highlight
- files are wired from [ContextPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/ContextPanel.tsx#L204)
- if those controls must remain metadata-driven, core needs more text actions, not just `text.fontSize`

### Dice

Current controls:

- `ThrowDice`
- `ChangeRange` min/max
- `StrokeStyle`
- `FillStyle`

Relevant files:

- [ThrowDice.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Dice/ThrowDice.tsx#L18)
- [ChangeRange.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Dice/ChangeRange/ChangeRange.tsx#L25)

Supported by current API:

- `dice.throw`
- `dice.range`
- `dice.fill`

What UI can preserve now:

- throw
- min/max range editing
- fill color

What core is missing if current behavior must be preserved:

- dice stroke controls if those are meant to be part of metadata-driven dice overlay

Possible UI simplification:

- keep dice stroke under generic non-overlay styling UI
- if so, current dice metadata is probably sufficient

### Deck

Current controls:

- `FlipDeck`
- `ShuffleDeck`
- `SpreadCards`
- `GetCard` top/bottom/random
- `CreateDeck` in multi-selection cases

Relevant files:

- [FlipDeck.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Deck/FlipDeck.tsx#L18)
- [ShuffleDeck.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Deck/ShuffleDeck.tsx#L18)
- [GetCard.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Deck/GetCard.tsx#L18)
- [SpreadCards.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Deck/SpreadCards/SpreadCards.tsx#L32)

Supported by current API:

- `deck.getTopCard`
- `deck.getBottomCard`
- `deck.getRandomCard`
- `deck.getCards`
- `deck.shuffle`
- `deck.flip`
- dynamic options for draw count

What UI can preserve now:

- single-deck actions
- draw-count option generation

What core is missing if current behavior must be preserved:

- selection-cardinality gating so deck actions can disappear for non-single selections
- explicit modeling of `CreateDeck`
- if `SpreadCards` must remain distinct from generic “draw N cards”, then either:
- `deck.getCards` must be defined as the spread action
- or a separate spread action is needed

Possible UI simplification:

- reduce deck overlay to single-deck actions only
- drop current multi-deck `CreateDeck` branch from overlay metadata work
- treat `SpreadCards` as a generic draw-count action if that UX change is acceptable

### Screen

Current controls:

- `StrokeStyle`
- `FillStyle`
- `SetBackgroundImage`
- `RemoveBackgroundImage`
- `GetRandomItem`

Relevant files:

- [ContextPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/ContextPanel.tsx#L594)
- [SetBackgroundImage.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Screeen/SetBackgroundImage.tsx#L21)
- [RemoveBackgroundImage.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Screeen/RemoveBackgroundImage.tsx#L18)

Supported by current API:

- `screen.background` as color

What UI can preserve now:

- background color only

What core is missing if current behavior must be preserved:

- async file/media picker action
- action to clear background image
- hidden-state support so color control can disappear when `backgroundUrl` exists and remove-image can appear instead

Possible UI simplification:

- first metadata-based screen overlay could support color only
- screen image background flow could remain custom until core adds async/hidden support

### Card

Current controls:

- `FlipCard`
- `CreateDeck`
- `RotateItem` left/right

Relevant files:

- [FlipCard.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Card/FlipCard.tsx#L18)
- [RotateItem.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/RotateItem.tsx#L18)
- [CreateDeck.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/CardGame/Card/CreateDeck.tsx#L29)

Supported by current API:

- `card.flip`
- `card.rotateCcw`
- `card.rotateCw`

What UI can preserve now:

- flip
- rotate left/right

What core is missing if current behavior must be preserved:

- `CreateDeck`

Possible UI simplification:

- keep `CreateDeck` out of the first metadata pass
- current card metadata is otherwise usable

## 4. Grouped Controls

### Already sufficient

shape stroke style

- current API is sufficient
- one action with groups can preserve current behavior well enough

drawing defaults and highlighter defaults

- current API is sufficient for the defaults themselves
- it is not sufficient for the current launcher that hosts them

shape picker with catalog

- current API is sufficient

### Not sufficient if current UI must remain visually decomposed

connector style

- current API is sufficient for semantic grouping
- current API is not sufficient for the current split-row presentation

What core should add only if exact current behavior matters:

- either split actions for each connector sub-control
- or layout hints allowing one grouped action to render as multiple sibling buttons

Recommended simplification:

- one grouped connector editor is acceptable for first migration

## 5. Editors

### Supported now

- `color`
- `enum-icon`
- `enum-list`
- `number`
- `number-stepper`
- `slider`
- `dynamic-options`
- `catalog`

### Missing only if current behavior must be preserved

boolean toggle

- needed for `ConnectorSmartJump`

async file/media picker

- needed for `SetBackgroundImage`

hidden and disabled state alongside editors

- needed for screen background flow and for controls that become unavailable

### Behaviors that can simplify without core changes

font size compound control

- today it combines text input, click-stepper, and preset menu [FontSize.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/Buttons/FontSize/FontSize.tsx#L29)
- the UI could simplify this to a generic metadata number editor

shape compact picker plus secondary catalog opener

- current API already has `catalog`
- UI can choose a simpler presentation if necessary

## 6. Icons

Current generic icon renderer only supports symbol ids via `<use xlinkHref="#...">` [Icon.tsx](/home/alex/microboard/hyperboard/microboardUI/src/shared/ui-lib/Icon/Icon.tsx#L190).

### Preservable now

- `symbol` icons
- hard-coded color indicator behavior through existing bespoke UI components

### Missing in core/UI contract if metadata-driven plugin icons must work

- generic runtime handling for `svg`
- generic runtime handling for `asset`
- generic metadata-driven support for `state.swatch`
- generic metadata-driven support for `state.tint`

Possible simplification:

- first migration can restrict metadata icons to `symbol`
- if core wants plugin-owned icons immediately, `svg` and `asset` need to be treated as real supported formats, not just declared contract variants

## 7. Mixed Selection Behavior

### Works with current API

same-type selection

- shapes
- connectors
- text font size
- dice

mixed shapes

- could actually improve relative to the current first-item-based UI
- if overlays are instance-aware, intersection by `action.id` is sufficient

### Not fully supported by current API

deck actions with multi-selection

- current UI hides most deck actions unless there is a single selected deck
- intersection by `action.id` alone is not enough
- core addition needed:
- selection-cardinality-aware visibility/applicability

`Card + Deck` mixed selection

- current UI has a dedicated branch [ContextPanel.tsx](/home/alex/microboard/hyperboard/microboardUI/src/features/ContextPanel/ContextPanel.tsx#L560)
- current design note explicitly leaves this unresolved
- core addition needed if behavior must remain:
- explicit mixed-selection action modeling for card/deck

Possible simplification:

- first metadata migration can omit the special `Card + Deck` branch
- if that is not acceptable, core must define it

## 8. Dynamic Options

Validated current use case:

- `deck.drawCount`

What current API can support:

- computing draw-count options from deck size

What core still needs if current behavior must remain exact:

- clear semantic decision whether this represents:
- generic draw-count
- or the current spread-cards action with layout side effects

Possible simplification:

- UI can treat current spread menu as a generic draw-count action in first pass

## 9. Missing Capabilities (Critical)

Only capabilities that the UI cannot supply by itself with the current API are listed here.

- toolbar launcher/group metadata
  - needed for `AddDrawing` and `AddGameItem`
- modal toolbar action semantics
  - needed for `AddDice` and `AddCard`
- toggle-style action/editor
  - needed for `ConnectorSmartJump`
- explicit action for connector pointer swap
  - needed for `SwitchPointers`
- selection-cardinality-aware visibility/applicability
  - needed for single-deck-only actions
- hidden-state metadata
  - needed for screen background color vs image controls
- disabled-state metadata
  - needed for parity with controls that are present but unavailable
- async file/media picker action
  - needed for screen background image upload flow
- metadata action for clearing uploaded/attached state
  - needed for `RemoveBackgroundImage`
- explicit metadata for `CreateDeck`
  - needed for card/deck overlay parity
- explicit metadata for wider text formatting if those controls are in scope
  - font style, alignment, lists, links, text color, text highlight
- real support for `svg` icons
- real support for `asset` icons
- generic support for dynamic swatch/tint icon state

## 10. Handout Back To Core Agent

### Core additions required to preserve current UI behavior

- Add toolbar launcher/group metadata so the UI can represent parent entries that own child tools.
- Add modal action semantics for toolbar entries that open creation/configuration flows instead of activating a tool.
- Add toggle-style action/editor support.
- Add explicit action metadata for connector pointer swap.
- Add selection-cardinality-aware visibility/applicability.
- Add hidden and disabled state support for actions and controls.
- Add async file/media picker actions plus a paired clear/remove action.
- Add explicit metadata for `CreateDeck` if card/deck overlay parity is required.
- Add more text actions if the existing text row must become metadata-driven.
- Make `svg`, `asset`, `state.swatch`, and `state.tint` actual supported icon features, not just type-level declarations.

### API decisions core should make soon

- Decide whether exact current `AddDrawing` launcher behavior is important, or whether the UI should flatten drawing tools.
- Decide whether exact current `AddGameItem` grouping is important, or whether the UI should flatten those entries.
- Decide whether current `SpreadCards` should be preserved as a distinct action or simplified into generic draw-count behavior.
- Decide whether the current special `Card + Deck` mixed-selection branch must remain.

### Simplifications the UI can accept without new core API

- Flatten drawing family into separate toolbar tools.
- Flatten game-item submenu into separate toolbar tools.
- Collapse connector row into one grouped editor.
- Simplify font size to a generic numeric editor.
- Support screen background color only in first pass and leave image background flow custom.
- Treat spread-cards as a generic draw-count action in first pass.
- Omit special `Card + Deck` mixed-selection behavior in first pass.

## Final Answer To The Mandatory Question

If the UI were rewritten to use the current overlay API as-is, while still trying to preserve current behavior, these controls would still require core changes:

- `AddDrawing` launcher
- `AddGameItem` launcher
- `AddDice` modal entry
- `AddCard` modal entry
- `ConnectorSmartJump`
- `SwitchPointers`
- single-deck-only deck action visibility
- special `Card + Deck` mixed-selection behavior
- `SetBackgroundImage`
- `RemoveBackgroundImage`
- any metadata-supplied `svg` icon
- any metadata-supplied `asset` icon
- any metadata-driven swatch/tint icon behavior

These controls could be implemented today if the UI accepts simplification:

- shape type picker
- shape fill
- shape stroke style
- connector editing as one grouped editor
- sticker defaults
- frame picker
- text font size
- dice throw/range/fill
- single-deck actions
- screen background color
