# UI Handout: Universal Overlay Metadata Contract

Superseded by [OverlayMetadataUIAgentHandout.md](/home/alex/microboard/hyperboard/microboard/OverlayMetadataUIAgentHandout.md) for the current repo state.

This document supersedes the earlier narrower handouts for day-to-day UI implementation.

Its goal is to let the UI rebuild the old experience as closely as practical while keeping this repo as the authoritative source of item-specific knowledge.

The important shift is:

- core describes capabilities, creation flows, defaults, editing actions, logical groupings, and applicability
- UI decides visual shells such as toolbar, context panel, dropdown, side panel, modal, or inline chip row

The contract lives in:

- [src/Overlay/OverlayMetadata.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/OverlayMetadata.ts)
- [src/Overlay/overlayRegistry.ts](/home/alex/microboard/hyperboard/microboard/src/Overlay/overlayRegistry.ts)

## 1. What The UI Should Read

For the create surface:

- `listCreateSurfaceEntries()`
- `listToolOverlays()`
- `getToolOverlay(toolName)`

For selected-item editing:

- `intersectOverlayActions(items)`
- `getSelectionOverlayActions(items)`
- `getItemOverlay(itemOrType)`
- `matchesOverlayCondition(condition, context)`

For dynamic option spaces:

- `resolveDynamicOptions(providerId, context)`

## 2. Core Concepts

### Create surface

Do not think in terms of the legacy toolbar specifically.

Think in terms of a universal create surface containing entries that either:

- activate a tool directly
- activate a related tool within a group
- open a metadata-defined creation workflow before activation

`listCreateSurfaceEntries()` returns:

- `tool` entries for standalone tools
- `group` entries for grouped related tools such as drawing tools or game-item tools

Each grouped tool is still independently registered. The group is just a universal description of related creation capabilities.

### Edit surface

Do not think in terms of the legacy context panel specifically.

Think in terms of a universal selection-edit surface containing:

- item actions
- action-local controls
- logical sections
- selection-level actions owned by plugins

Sections are semantic grouping only. UI may render them as rows, menus, accordion groups, or compact button clusters.

## 3. Tool Metadata

`ToolOverlayDefinition` now has two important additions beyond the first pass:

- `surface`
- `launch`

### `surface`

`surface` describes how a tool participates in the universal create surface.

Fields:

- `order`: ordering among peers
- `group`: optional grouping metadata
- `relatedToolNames`: sibling tools the UI may expose together

`group` describes a universal tool family, not a concrete widget.

Supported group behaviors:

- `open-panel`
- `activate-last-used`

Current built-in uses:

- drawing tools are one grouped family with `activate-last-used`
- game-item tools are one grouped family with `open-panel`

### `launch`

`launch` tells the UI whether clicking the create entry should:

- activate the tool immediately with `kind: "activate-tool"`
- open a metadata-defined property sheet with `kind: "workflow"`

This is the path for future modal-like creation flows without baking modal mechanics into core.

The workflow is described as a property sheet:

- controls
- optional control groups
- optional submit label

UI remains free to render that sheet as a dropdown, side panel, modal, or inline panel.

## 4. Editor Metadata

The UI should now support these editor kinds:

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

### `color.presentation`

This is the lightweight visual hint needed for legacy cases where presentation carried meaning:

- `circle`
- `square`
- `sticker`

Current use:

- sticker defaults now explicitly request `presentation: "sticker"`
- screen stroke uses `presentation: "square"`

### `enum-icon.quickOptions`

This lets core describe a quick-access subset without hardcoding an old widget.

Useful fields:

- `family`
- `optionIds`
- `maxVisible`
- `overflow`

Current use:

- shapes can expose a quick subset derived from `family: "basicShapes"` while still carrying the full catalog

### `asset-upload`

This is the missing generic upload description that UI should use for:

- screen background image
- future media creation workflows
- future card-front/card-back upload flows

Supported modes:

- `single`
- `multiple`
- `paired`

Supported fields:

- `accept`
- optional named `fields`

Value contract:

- `single`: UI should pass the uploaded asset URL or storage reference as one value
- `multiple`: UI should pass an ordered list of uploaded asset URLs or storage references
- `paired`: UI should pass a structured object keyed by `fields[].id`

Core still owns the eventual item/tool operation. UI owns file picking and upload orchestration.

## 5. Applicability And Conditional Visibility

The first two passes avoided this, but the old UI genuinely needs minimal state-aware applicability.

Core now exposes `when` on:

- actions
- controls
- control groups

Use `matchesOverlayCondition(condition, context)` rather than duplicating the interpreter in UI.

Supported condition forms:

- `equals`
- `truthy`
- `falsy`
- `itemTypeIn`
- `selectionSize`
- `allOf`
- `anyOf`
- `not`

This is intentionally small and capability-focused.

It exists for real product cases such as:

- screen background-image actions that change when `backgroundUrl` exists
- future shape fill gating when a selected shape family is open-only
- future creation workflows whose fields depend on prior values

## 6. Logical Grouping

There are now two grouping layers:

- control groups inside one action
- action sections across multiple actions

Use action sections to recreate logical blocks such as:

- type
- appearance
- arrows
- typography
- game actions

This is not row-placement metadata.

It is semantic grouping that lets the UI decide its own shell while still keeping item knowledge in core.

## 7. How To Map The Old UI

### Drawing

Use the grouped create-surface entry returned from `listCreateSurfaceEntries()`.

Behavior:

- group behavior is `activate-last-used`
- child tools remain `AddDrawing`, `AddHighlighter`, `Eraser`
- tool icons may use `icon.state.swatch`

UI can reproduce the old launcher closely without hardcoding the drawing family by name.

### Game items

Use the grouped create-surface entry for the game family.

Current built-ins inside the group:

- `AddDice`
- `AddScreen`
- `AddPouch`

Future path:

- `AddCard` should join this same family once a tool-side creation workflow is exposed

### Shapes

Use:

- `enum-icon.quickOptions` for the compact picker
- `catalog` for the larger catalog
- option `family` for category-aware quick access

This is the correct universal replacement for the old clipped shape picker plus “show all”.

### Connector

Treat connector defaults and connector editing as logically grouped metadata, not as a hardcoded button row.

Important nuance now present in metadata:

- connector create defaults have a quick group and a fuller advanced group
- connector selection editing remains richer than the compact create picker

If UI wants separate peer buttons, it may decompose one logical section into multiple controls. If UI wants one grouped popover, that also stays valid.

### Screen

Use conditional actions:

- `screen.backgroundImage` only when there is no image
- `screen.removeBackgroundImage` only when an image exists

Use `asset-upload` for the upload request itself.

### Cards

Cards are the main remaining creation-flow gap in built-ins.

The intended universal solution is:

- a tool overlay with `launch.kind: "workflow"`
- a workflow property sheet containing an `asset-upload` control with `mode: "paired"` or `mode: "multiple"` plus named fields such as `front` and `back`

That keeps card creation generic and reusable for future plugin-defined paired assets.

## 8. Normalizations We Should Keep

The old UI had some inconsistencies that should not be preserved as sacred behavior.

The UI should treat these consistently when consuming metadata:

- common actions like delete and duplicate should be universal selection actions, not item-family quirks
- create-surface grouping should come from tool metadata, not hardcoded family names
- selection editing should default to action intersection plus `when` applicability, not first-selected-item special cases
- grouped actions may render differently across desktop and mobile as long as the same metadata drives them

## 9. Built-In Examples Already Using The New Contract

Examples now present in core:

- drawing tools grouped into one create-surface family
- game tools grouped into one create-surface family
- shapes using option families plus quick-access hints
- sticker tool requesting sticker-style color chips
- connector create defaults split into quick vs advanced groups
- screen using conditional background-image actions and `asset-upload`
- item overlays exposing logical sections for shape, text, dice, and screen editing

## 10. Remaining Work After This Handout

Still recommended in core:

- add `AddCard` as a real tool overlay using `launch.kind: "workflow"`
- expand rich-text metadata beyond font size
- add precise fill applicability for open-only shape families if the UI needs exact legacy parity
- expose more media creation tools through the same `asset-upload` path

Not recommended in core:

- naming concrete UI widgets like toolbar, context panel, dropdown, or modal in metadata
- encoding pixel layout, popover offsets, or overflow CSS into metadata
- hardcoding plugin-specific UI components in this repo
