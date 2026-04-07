# UI Agent Handout: Packaged Overlay Metadata, Workflows, And Icons

This handout supersedes the earlier overlay UI handouts.

Use it when integrating the UI against the current core package contract.

## What Changed

Core now exposes the remaining pieces the UI report was blocked on:

- packaged overlay icon delivery
- a package-consumable overlay icon manifest
- a real `AddCard` create-surface workflow entry
- built-in selection actions for common board actions

The UI should now be able to consume overlay metadata without sibling-repo file crawling.

## APIs To Use

From the main package export:

- `listCreateSurfaceEntries()`
- `getToolOverlay(toolName)`
- `getItemOverlay(itemOrType)`
- `intersectOverlayActions(items)`
- `getSelectionOverlayActions(items)`
- `matchesOverlayCondition(condition, context)`
- `resolveDynamicOptions(providerId, context)`

From the package icon subpath:

- `microboard-temp/overlay-icon-manifest`

It exports:

- `overlayIconManifest`
- `getOverlayIconAsset(path)`

## Icon Contract

### Asset icons

Built-in asset icons now use published package paths, not source-tree paths.

Examples:

- `overlay-icons/Items/Drawing/icons/Pen.icon.svg`
- `overlay-icons/Items/Card/icons/Tool.icon.svg`
- `overlay-icons/Overlay/icons/Delete.icon.svg`

When metadata says `icon.kind: "asset"`, use `icon.path` as the manifest key.

Recommended UI flow:

1. Read `icon.path` from metadata.
2. Resolve it through `overlayIconManifest[icon.path]` or `getOverlayIconAsset(icon.path)`.
3. Render the returned data URL in the UI.

### Symbol icons

`symbol` remains supported.

If `icon.kind: "symbol"` and `icon.sourcePath` is present, that path is now also package-published under `overlay-icons/...`.

The built-in sprite path is:

- `overlay-icons/Overlay/overlay-icons.svg`

### Raw asset fallback

The package also publishes raw SVG files through the export pattern:

- `microboard-temp/overlay-icons/*`

The manifest is still the preferred integration because it avoids bundler-specific file resolution work.

## Create Surface

Use `listCreateSurfaceEntries()` as the source of truth.

The create surface now includes:

- standalone tools
- grouped tool families
- workflow launchers

### Card creation

`AddCard` is now a first-class create-surface entry from core.

It is a workflow launcher:

- `toolName: "AddCard"`
- `launch.kind: "workflow"`
- `createsItemType: "Card"`

Its workflow currently uses:

- one `asset-upload` control
- `mode: "paired"`
- fields `face` and `back`

## Workflow Submit Contract

Workflows may now define `workflow.submit`.

Current supported submit kind:

- `create-items`

Fields:

- `itemType`
- `strategy`
- `placement`
- `properties`

### Property bindings

`properties` maps item properties from workflow values.

Supported binding sources:

- `controlValue`
- `uploadField`

### Card workflow semantics

For `AddCard`, core defines:

- `strategy: "per-upload-entry"`
- `placement: "stagger-from-pointer"`
- `faceUrl <- uploadField(face)`
- `backsideUrl <- uploadField(back)`

So the UI should:

1. collect one or more front/back pairs through the generic upload UI
2. upload them through the existing media pipeline
3. create one `Card` item per completed pair
4. write the uploaded URLs into `faceUrl` and `backsideUrl`

No UI-local card modal contract should be hardcoded anymore.

## Selection Surface

The selection surface should combine:

- `intersectOverlayActions(items)` for item-owned actions
- `getSelectionOverlayActions(items)` for board-level or text-level selection actions

Built-in selection metadata now includes:

- delete
- duplicate
- lock
- unlock
- bring to front
- send to back
- text font size
- text color
- text highlight

These should no longer stay UI-owned special cases.

## Context For Conditions And Values

When the UI evaluates metadata, provide the richest applicable context:

- `{ tool }` for create-surface tool defaults
- `{ item, items }` for item actions
- `{ items, selection }` for selection actions

`OverlayValueSource` now supports:

- `itemProperty`
- `toolProperty`
- `selectionProperty`

For selection actions, `selectionProperty` can read selection getters such as:

- `getFontSize`
- `getFontColor`
- `getFontHighlight`

## Practical Rendering Notes

- Respect `sections` for item overlays.
- Respect `groups` inside actions.
- Respect `when` conditions through `matchesOverlayCondition(...)`.
- Respect `color.presentation`.
- Respect `enum-icon.quickOptions`.
- Treat `asset-upload` as the generic upload surface, including card workflows.

## Migration Notes

The previous UI-side sibling manifest bridge should be removed once the package version with these changes is consumed.

The expected steady-state integration is:

- metadata from the main package
- icons from `overlay-icon-manifest`
- no UI-local item icon remapping
- no UI-local card-create contract
