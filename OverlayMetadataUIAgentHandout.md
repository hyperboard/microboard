# UI Agent Handout: Consuming Overlay Metadata From Core

Superseded by [OverlayMetadataPackagedUIAgentHandout.md](/home/alex/microboard/hyperboard/microboard/OverlayMetadataPackagedUIAgentHandout.md).

This is the current handout the UI repo should implement against.

Use this document as the primary integration guide.

Older docs in this repo are still useful as history and migration notes, but this one reflects the contract and built-in metadata structure that exists now.

## Goal

The UI should stop hardcoding item-specific overlay behavior.

This repo now provides:

- create-surface metadata for tools and grouped tool families
- selection-edit metadata for item actions and plugin-owned selection actions
- editor descriptions for values and workflows
- applicability rules
- logical grouping
- built-in icon assets, mostly stored next to the items that own them

The UI should focus on rendering and interaction shells, not on item knowledge.

## APIs To Read

From [src/Overlay/index.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/index.ts):

- `listCreateSurfaceEntries()`
- `listToolOverlays()`
- `getToolOverlay(toolName)`
- `getItemOverlay(itemOrType)`
- `intersectOverlayActions(items)`
- `getSelectionOverlayActions(items)`
- `resolveDynamicOptions(providerId, context)`
- `matchesOverlayCondition(condition, context)`

## Create Surface

Use `listCreateSurfaceEntries()` as the source of truth for the create surface.

It returns:

- `tool` entries for standalone tools
- `group` entries for grouped tool families

Current grouped families include:

- drawing tools
- game-item tools

The UI may render these as toolbar launchers, grouped buttons, side panels, or other shells.

Do not hardcode drawing/game grouping by name in the UI. Read it from metadata.

### Tool activation

Each tool overlay may define:

- `launch.kind: "activate-tool"`
- `launch.kind: "workflow"`

`activate-tool` means the UI can immediately activate the tool.

`workflow` means the UI should first render the workflow described by metadata, then apply/submit it.

## Selection Edit Surface

Use `intersectOverlayActions(items)` for the default item-action surface.

Use `getSelectionOverlayActions(items)` for plugin-owned selection actions that apply to the whole selection.

Use `matchesOverlayCondition(condition, context)` for:

- actions
- controls
- control groups

This is the supported way to hide or show state-dependent actions such as screen background-image actions.

## Logical Grouping

There are two levels of semantic grouping:

- `groups` inside one action
- `sections` across actions in one item overlay

These are not layout instructions.

They exist so the UI can render consistent structures while keeping the item-specific grouping decisions in core.

## Editor Kinds

Current editor kinds:

- `color`
- `enum-icon`
- `enum-list`
- `number`
- `number-stepper`
- `slider`
- `toggle`
- `dynamic-options`
- `catalog`
- `asset-upload`

Important newer pieces:

- `color.presentation`
- `enum-icon.quickOptions`
- `asset-upload`

## Icon Contract

### What the UI should expect

Built-in overlay metadata is now primarily asset-based.

For current built-ins, the UI should expect `icon.kind: "asset"` and render the SVG file at `icon.path`.

Most of those icon files now live next to the items that own them, for example:

- drawing icons in [src/Items/Drawing/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Drawing/icons)
- connector icons in [src/Items/Connector/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/icons)
- shape icons in [src/Items/Shape/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/icons)
- BPMN shape icons in [src/Items/Shape/BPMN](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/BPMN)
- frame icons in [src/Items/Frame](/home/alex/microboard/hyperboard/microboard/src/Items/Frame)
- dice icons in [src/Items/Dice/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Dice/icons)
- screen icons in [src/Items/Screen/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Screen/icons)
- deck icons in [src/Items/Deck/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Deck/icons)
- card icons in [src/Items/Card/icons](/home/alex/microboard/hyperboard/microboard/src/Items/Card/icons)
- text icons in [src/Items/RichText/icons](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/icons)

`symbol` remains part of the type system for extensibility, but the UI should not rely on a UI-local sprite for current built-in metadata.

### Dynamic icon state

`icon.state.swatch` can appear on both `asset` and `symbol` icons.

Treat it as a rendering hint.

The UI may show:

- a swatch chip
- a tinted accent area
- a secondary color marker

Current important uses:

- drawing tool color
- highlighter tool color
- connector tool color
- shape fill
- dice fill
- screen background
- screen stroke
- sticker color

## Rendering Rules

### `enum-icon`

Render the option icons from metadata.

Use `quickOptions` when present for the compact picker.

Use `catalog` when present for the expanded option space.

### `color`

Respect `presentation` when present:

- `circle`
- `square`
- `sticker`

This matters for fidelity with the legacy UI, especially stickers and some framed/square controls.

### `asset-upload`

This is the generic UI hook for uploads and media-like workflows.

Current built-in use:

- screen background image

Planned future use:

- card creation workflow
- media creation flows

The UI owns file picking and upload orchestration. Core owns the operation or property that receives the resulting value.

## Current Built-In Mapping Notes

### Drawing

The grouped create entry describes the drawing launcher family.

Use group behavior:

- `activate-last-used`

Child tools remain separate metadata entries:

- `AddDrawing`
- `AddHighlighter`
- `Eraser`

### Game items

The grouped create entry describes the game-items family.

Current built-ins:

- `AddDice`
- `AddScreen`
- `AddPouch`

### Shape

Shape quick picking should come from metadata:

- basic inline options
- quick-options hint
- full catalog
- option icons shipped by core

### Connector

Connector create defaults and connector edit actions should be rendered from the metadata structure, not a hardcoded connector row.

Current built-ins provide:

- create defaults
- quick vs advanced grouping
- start/end pointer icons
- line style icons
- smart-jump icon
- switch-pointers action

### Screen

Screen demonstrates the intended state-aware flow:

- background action
- stroke action
- background-image add action
- background-image remove action

The UI should use `matchesOverlayCondition` rather than its own special-case logic.

## Historical Normalization

The legacy UI had inconsistencies.

The UI should intentionally normalize these when driven by metadata:

- common selection actions should be consistent
- selection applicability should come from metadata intersection plus `when`
- tool family grouping should come from `surface.group`
- item-specific icon resolution should come from the icon metadata provided here

## Recommended UI Implementation Order

1. Read create entries from `listCreateSurfaceEntries()`.
2. Render tool icons directly from `icon.path` when `kind === "asset"`.
3. Read selection actions from `intersectOverlayActions(items)` and `getSelectionOverlayActions(items)`.
4. Filter actions and controls with `matchesOverlayCondition`.
5. Render groups and sections as semantic structure, not rigid layout instructions.
6. Add support for `asset-upload` workflows.

## Superseded Docs

For implementation, prefer this handout over:

- [OverlayMetadataUIHandout.md](/home/alex/microboard/hyperboard/microboard/OverlayMetadataUIHandout.md)
- [OverlayMetadataUniversalUIHandout.md](/home/alex/microboard/hyperboard/microboard/OverlayMetadataUniversalUIHandout.md)

Those documents are still useful for context, but this one is the direct guide for the UI repo agent.
