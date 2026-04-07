# Overlay UI Reference Spec

This document reconstructs the pre-migration overlay UI from the legacy UI implementation in this repository.

It describes what the old UI actually did, based on the old `ToolsPanel`, `ContextPanel`, picker components, and button/menu components that existed before the metadata migration.

## 1. Toolbar Reference

Legacy top-level order in `src/features/ToolsPanel/ToolsPanel.tsx`:

1. `AddGameItem`
2. `AddTemplate`
3. separator
4. `Select`
5. `AddDrawing`
6. `AddText`
7. `AddShape`
8. `AddConnector`
9. `AddSticker`
10. `AddFrame`
11. `AddMedia`

Toolbar wrappers and grouping:

- `AddGameItem` was a launcher, not a flat set of top-level tools.
- `AddDrawing` was a launcher, not separate top-level pen/highlighter/eraser buttons.
- `AddShape` was a single top-level tool with a clipped inline quick picker plus a `Show all` entry into the side panel.
- `AddText` was a plain button with no dropdown.
- `AddConnector` was a single top-level button with a compact line-style menu.
- `AddSticker` was a single top-level button with a color menu.
- `AddFrame` was a single top-level button with a frame picker menu.

Top-level icons:

- `AddGameItem`: `GameItems`
- `AddDrawing`: current last-opened child icon, one of `Pen`, `Highlighter`, `Eraser`
- `AddText`: `Text`
- `AddShape`: `Shape` when no selected shape, otherwise selected `ShapeIcon`
- `AddConnector`: `Connector`
- `AddSticker`: `Sticker`
- `AddFrame`: `Frame`

## 2. Game Items Reference

Legacy launcher implementation: `src/features/ToolsPanel/Buttons/AddGameItem/AddGameItem.tsx`

Behavior:

- Clicking the top-level `GameItems` button toggled the launcher open and closed.
- The launcher used `useClickOutside` and closed when clicking outside.
- The top-level launcher button itself stayed top-level in the toolbar; its children were not flattened.

Launcher contents and order:

1. `AddDice`
2. `AddScreen`
3. `AddPouch`
4. `AddCard`

Child button details:

- `AddDice` opened the dice-creation modal. It was not a plain create-tool activation.
- `AddScreen` activated `AddScreen` through `board.tools.addRegisteredTool("AddScreen", true)`.
- `AddPouch` activated `AddPouch` through `board.tools.addRegisteredTool("AddPouch", true)`.
- `AddCard` opened the cards-creation modal. It was not metadata-driven.

Known UI-owned area:

- `AddCard` remained modal/UI-owned rather than tool-overlay-driven.
- The launcher shell itself was entirely UI-owned.

## 3. Drawing Launcher Reference

Legacy implementation:

- `src/features/ToolsPanel/Buttons/AddDrawing/AddDrawing.tsx`
- `src/features/ToolsPanel/Buttons/AddDrawing/AddPen/AddPen.tsx`
- `src/features/ToolsPanel/Buttons/AddDrawing/AddHighlighter/AddHighlighter.tsx`
- `src/features/ToolsPanel/Buttons/AddDrawing/Eraser/Eraser.tsx`

Launcher behavior:

- One top-level toolbar button represented the whole drawing launcher.
- The top-level button remembered the last-opened child via `lastOpenedMenu`.
- Clicking the top-level button activated the remembered child:
  - `Pen` -> `board.tools.addDrawing(true)`
  - `Highlighter` -> `board.tools.addHighlighter(true)`
  - `Eraser` -> `board.tools.eraser(true)`
- The top-level icon also switched to the remembered child icon.
- A small color indicator dot appeared on the top-level button when the remembered tool had a color.

Launcher contents and order:

1. `AddPen`
2. `AddHighlighter`
3. `Eraser`

Menu layout:

- The launcher menu used the generic toolbar menu positioning, then applied `transform: translateY(calc(0% - (100% / 3)))` from `AddDrawing.module.css`.
- This made the drawing menu sit higher than most other toolbar menus.

Pen menu:

- Layout: vertical panel with
  - stroke-width slider
  - semantic foreground color picker
  - custom color input
- `Pen` child button rounded top.

Highlighter menu:

- Layout: vertical panel with
  - stroke-width slider
  - semantic foreground color picker
  - custom color input
- Highlighter colors were converted to semi-transparent RGBA before applying.

Eraser:

- No menu content.
- `Eraser` child button rounded bottom.

## 4. Shape Tool Reference

Legacy implementation: `src/features/ToolsPanel/Buttons/AddShape/AddShape.tsx`

Top-level behavior:

- One top-level `AddShape` button.
- If a shape type was already selected, the top-level button showed that specific `ShapeIcon`.
- If no shape type was selected, the top-level button showed the generic `Shape` icon.

Click/open behavior:

- First activation started the shape tool if inactive.
- When active, clicking toggled between open and collapsed quick picker states through `isShapeSelected`.
- The quick picker was only shown when:
  - the shape tool was active
  - no shape had just been chosen
  - the full shapes side panel was not already open

Quick picker behavior:

- The quick picker rendered the full `ShapePicker` for the current `selectedCategory`.
- In the common case, `selectedCategory` started as `basicShapes`.
- The tool did not use a five-item inline shortlist. It rendered the whole category list into a fixed clipped menu.

Exact quick-picker composition:

- `ShapePicker` rendered `SHAPES_CATEGORIES.find(category => category.name === categoryName).shapes`.
- For `basicShapes`, that category contained 21 shapes:
  - `Rectangle`
  - `RoundedRectangle`
  - `Circle`
  - `Triangle`
  - `Rhombus`
  - `SpeachBubble`
  - `ArrowRight`
  - `ArrowLeft`
  - `Cloud`
  - `Parallelogram`
  - `Star`
  - `BracesRight`
  - `BracesLeft`
  - `ArrowLeftRight`
  - `Cross`
  - `Cylinder`
  - `Trapezoid`
  - `PredefinedProcess`
  - `Octagon`
  - `Hexagon`
  - `Pentagon`

Quick-picker layout:

- Grid columns: `repeat(3, 32px)`
- Wrapper height: `192px`
- Overflow: hidden
- `Show all` button below the clipped grid

Important implication:

- The old quick picker exposed substantially more than the current metadata inline list of five basic options.
- The full category was rendered, then visually clipped by container height.

Show-all behavior:

- `Show all` opened the shapes side panel through `openShapesPanel`.
- The side panel was the canonical full catalog.

Icons:

- Inline shape options used `ShapeIcon`.
- Non-basic categories showed translated tooltips.

## 5. Connector Tool Reference

Legacy implementation: `src/features/ToolsPanel/Buttons/AddConnector.tsx`

Top-level behavior:

- One top-level `Connector` button.
- Clicking the button activated the connector tool.

Tool menu contents:

- The toolbar connector menu exposed only connector line style selection.
- No color.
- No width.
- No border pattern.
- No start/end arrow controls.
- No smart-jump control.

Exact options:

1. `straight`
2. `curved`
3. `orthogonal`

Presentation:

- Compact vertical menu using `ConnectorLineStylePicker`
- Icon-only options
- Each option used `ConnectorIcon`

Menu shell:

- `UiPanel vertical padding={0}`
- Positioned with the generic toolbar menu placement from `ButtonWithMenu.module.css`

## 6. Sticker Tool Reference

Legacy implementation: `src/features/ToolsPanel/Buttons/AddSticker.tsx`

Top-level behavior:

- One top-level `Sticker` button.
- Clicking activated the sticker tool.

Menu contents:

- Semantic color picker only.
- No extra grouped controls.

Presentation:

- `UiPanel grid columns={2} gap={4} padding={8}`
- `SemanticColorPicker variant="square"`

Exact visual style of sticker color items:

- Rendered with `SquareColorItem`, not `ColorItem`
- Outer button: `40px x 40px`
- Inner chip: `25px x 25px`
- Square chip with subtle border
- Active/hover state used a square background highlight, not circular rings

## 7. Frame Tool Reference

Legacy implementation: `src/features/ToolsPanel/Buttons/AddFrame.tsx`

Top-level behavior:

- One top-level `Frame` button.
- Clicking activated the frame tool.

Menu contents:

- Frame type picker only.

Exact options from `FRAME_TYPES`:

1. `Custom`
2. `16:9`
3. `3:2`
4. `4:3`
5. `A4`
6. `Letter`
7. `9:18`
8. `1:1`

Presentation:

- `UiPanel gap={4} grid columns={4}`
- `FramePicker` buttons were `40px` wide
- Each option was a compact vertical stack:
  - `FrameIcon`
  - text label

Important sizing detail:

- The old frame menu width came from its actual content grid.
- It did not impose a large generic minimum width.

## 8. Floating Context Panel Section Reference

Legacy implementation: `src/features/ContextPanel/ContextPanel.tsx`

The old context panel was item-family-specific and explicitly ordered. The following lists are exact legacy inline order.

### Text

Inline order:

1. `FontSize`
2. `FontStyle`
3. `TextAlignment`
4. `AddList`
5. `HyperLinkBtn`
6. separator
7. `TextColor`
8. `TextHighlight`
9. separator
10. `Lock`
11. separator
12. `GroupItems`
13. `DetachFromGroup`
14. `SelectParent`
15. `Delete`
16. separator
17. optional AI block:
18. `AIModel`
19. `AIGeneration`
20. separator
21. `RestOptionsMenu`

Rest menu contents:

- `BringToFront`
- `SendToBack`
- `CopyItemLink`
- `SetLinkTo`
- `Duplicate`
- `ForceGraphToggle`

### Sticker

Inline order:

1. `FontSize`
2. separator
3. `FontStyle`
4. `TextAlignment`
5. `AddList`
6. `HyperLinkBtn`
7. separator
8. `TextColor`
9. `TextHighlight`
10. separator
11. `StickerFillStyle`
12. separator
13. `Lock`
14. separator
15. `GroupItems`
16. `DetachFromGroup`
17. `SelectParent`
18. `Delete`
19. separator
20. optional AI block
21. `RestOptionsMenu`

### Shape

Inline order:

1. `ItemType`
2. separator
3. conditional text block when `getIsShapeWithText()`
4. `FontSize`
5. separator
6. `FontStyle`
7. `TextAlignment`
8. `AddList`
9. `HyperLinkBtn`
10. separator
11. `TextColor`
12. `TextHighlight`
13. separator
14. `StrokeStyle`
15. conditional `FillStyle` only when `getPath().isClosed()`
16. separator
17. `Lock`
18. separator
19. `GroupItems`
20. `DetachFromGroup`
21. `SelectParent`
22. `Delete`
23. separator
24. optional AI block
25. `RestOptionsMenu`

### Connector

Inline order:

1. `StartPointer`
2. `SwitchPointers`
3. `EndPointer`
4. separator
5. `ConnectorType`
6. `ConnectorSmartJump`
7. `ConnectorLineColor`
8. separator
9. `ConnectorAddText`
10. `ConnectorFontSize`
11. `ConnectorFontStyle`
12. `ConnectorTextColor`
13. `ConnectorTextHighlight`
14. `Lock`
15. separator
16. `GroupItems`
17. `DetachFromGroup`
18. `SelectParent`
19. `Delete`
20. separator
21. `RestOptionsMenu`

Rest menu contents:

- `BringToFront`
- `SendToBack`
- `CopyItemLink`
- `SetLinkTo`
- `Duplicate`

Important decomposition detail:

- Pointer controls were separate peer buttons.
- Connector type, smart jump, and line color were also separate peer controls.
- They were not one combined style dropdown.

### Drawing

Inline order:

1. `DrawStrokeWidth`
2. separator
3. `DrawFillStyle`
4. separator
5. `Lock`
6. separator
7. `GroupItems`
8. `DetachFromGroup`
9. `SelectParent`
10. `Delete`
11. separator
12. `RestOptionsMenu`

### Image

Inline order:

1. `Lock`
2. `RotateItem` counter-clockwise
3. `RotateItem` clockwise
4. separator
5. `GroupItems`
6. `DetachFromGroup`
7. `SelectParent`
8. `Delete`
9. separator
10. `RestOptionsMenu`

Rest menu contents:

- `BringToFront`
- `SendToBack`
- `CopyItemLink`
- `SetLinkTo`
- `Duplicate`
- `SaveImg`

### Frame

Inline order:

1. `FrameRatio`
2. `ToggleFrameRatio`
3. separator
4. `FrameFill`
5. separator
6. `Lock`
7. separator
8. `GroupItems`
9. `DetachFromGroup`
10. `SelectParent`
11. `Delete`
12. separator
13. `RestOptionsMenu`

Rest menu contents:

- `BringToFront`
- `SendToBack`
- `FrameNavNext`
- `FrameNavPrev`
- `CopyItemLink`
- `SetLinkTo`
- `Duplicate`
- `ExportFrame`

### Deck

Inline order:

1. `FlipDeck`
2. `ShuffleDeck`
3. separator only when single deck selected
4. `SpreadCards`
5. separator only when single deck selected
6. `GetCard top`
7. `GetCard bottom`
8. single-selection branch:
9. `GetCard random`
10. multi-selection branch:
11. `CreateDeck onlyCards={false}`
12. separator
13. `GroupItems`
14. `DetachFromGroup`
15. `SelectParent`
16. `Delete`
17. separator
18. `RestOptionsMenu`

### Card

Inline order:

1. `FlipCard`
2. separator
3. `CreateDeck onlyCards={true}`
4. separator
5. `RotateItem` counter-clockwise
6. `RotateItem` clockwise
7. separator
8. `LockResize`
9. separator
10. `GroupItems`
11. `DetachFromGroup`
12. `SelectParent`
13. `Delete`
14. separator
15. `RestOptionsMenu`

### Mixed Card + Deck

Inline order:

1. `FlipCard`
2. separator
3. `CreateDeck onlyCards={false}`
4. separator
5. `Delete`

### Dice

Inline order:

1. `ThrowDice`
2. `ChangeRange min`
3. `ChangeRange max`
4. separator
5. `StrokeStyle`
6. `FillStyle`
7. separator
8. `GroupItems`
9. `DetachFromGroup`
10. `SelectParent`
11. `Delete`
12. separator
13. `RestOptionsMenu`

Important detail:

- Dice range was represented by two peer controls, min and max.
- It was not one generic number-stepper control.

### Screen

Inline order:

1. `StrokeStyle`
2. if any selected screen had `backgroundUrl`:
3. `SetBackgroundImage`
4. `RemoveBackgroundImage`
5. else:
6. `FillStyle`
7. `SetBackgroundImage`
8. separator
9. `GetRandomItem`
10. `GroupItems`
11. `DetachFromGroup`
12. `SelectParent`
13. `Delete`
14. separator
15. `RestOptionsMenu`

Important detail:

- Screen background-image state changed which peer buttons were visible.
- This was value-dependent UI behavior, not only item-type-dependent behavior.

### Floating-context dropdown internals

The old context panel did not only define which peer button appeared. It also had stable internal menu structure for each dropdown-capable button.

#### `FontSize`

Legacy implementation:

- `src/features/ContextPanel/Buttons/FontSize/FontSize.tsx`
- `src/features/Pickers/FontSizePicker/FontSizePicker.tsx`

Button structure:

- Composite peer button, not plain icon-only.
- Left side: inline numeric text input showing current size.
- Right side: chevron segment.
- Button min width: `76px`.
- Input max width: `36px`.

Dropdown structure:

- Vertical list, no grid.
- Implemented by `FontSizePicker`.
- Each row was a full-width `UiButton`.
- Preset sizes:
  - `10`
  - `12`
  - `14`
  - `18`
  - `24`
  - `36`
  - `48`
  - `64`
  - `80`
  - `144`
  - `288`
- `auto` was shown only for sticker text sizing.
- Disabled rows could appear when a max size constraint existed.

Metadata implication:

- This was not a generic number-stepper.
- It was a typed `font-size` control with both inline direct-entry and preset-menu affordances.

#### `FontStyle`

Legacy implementation:

- `src/features/ContextPanel/Buttons/FontStyle.tsx`
- `src/features/Pickers/FontStylePicker.tsx`

Button:

- Top-level peer button used `TextStyle` icon.

Dropdown structure:

- `UiPanel padding={12} gap={8}`
- Four peer icon buttons in one row:
  - `TextBold`
  - `TextItalic`
  - `TextUnderline`
  - `TextStrike`
- Each option had tooltip + hotkey metadata.
- These were toggles, not single-choice radio items.

Metadata implication:

- This control family needs grouped boolean text-style toggles, not one enum.

#### `TextAlignment`

Legacy implementation:

- `src/features/ContextPanel/Buttons/TextAlignment/TextAlignment.tsx`
- `src/features/Pickers/HorizontalAlignmentPicker.tsx`
- `src/features/Pickers/VerticalAlignmentPicker.tsx`

Button:

- Top-level peer button reflected current horizontal alignment icon.

Dropdown structure:

- First row: horizontal alignment picker
  - `TextAlignLeft`
  - `TextAlignCenter`
  - `TextAlignRight`
- Separator between groups
- Second row: vertical alignment picker
  - `VerticalAlignTop`
  - `VerticalAlignCenter`
  - `VerticalAlignBottom`

Metadata implication:

- The old UI treated text alignment as one grouped dropdown containing two related enum pickers.

#### `TextColor`

Legacy implementation:

- `src/features/ContextPanel/Buttons/TextColor.tsx`
- `src/shared/ui-lib/Icon/TextColorIndicator/TextColorIndicator.tsx`

Button:

- Used `TextColorIndicator`, not plain `TextColor`.
- Base glyph: `TextColor`
- Color value rendered as a `19px x 4px` bar centered along the bottom of the icon.

Dropdown structure:

- `UiPanel grid columns={4} gap={8}`
- Semantic foreground color swatches
- One custom color input entry
- Circular swatches, not square

Metadata implication:

- A text-color control in the old UI had two parts:
  - semantic palette picker
  - custom-color affordance
- The toolbar/context descriptor should be able to describe both.

#### `TextHighlight`

Legacy implementation:

- `src/features/ContextPanel/Buttons/TextHighlight.tsx`
- `src/shared/ui-lib/Icon/TextHighlightIndicator/TextHighlightIndicator.tsx`

Button:

- Used `TextHighlightIndicator`, not plain `TextHighlight`.
- Base glyph: `TextHighlight`
- Color value rendered as a small `8px x 8px` square-ish badge at the icon corner.

Dropdown structure:

- `UiPanel grid columns={4} gap={8}`
- Semantic background/highlight swatches
- One custom color input entry
- Circular swatches

#### `FillStyle` / `FrameFill` / `ConnectorLineColor`

Legacy implementations:

- `src/features/ContextPanel/Buttons/FillStyle.tsx`
- `src/features/ContextPanel/Buttons/FrameFill.tsx`
- `src/features/ContextPanel/Buttons/ConnectorLineColor.tsx`

Button:

- Used `FillColorIndicator` or `StrokeColorIndicator`, not a static glyph.

Dropdown structure:

- `UiPanel grid columns={4} gap={8}`
- Semantic palette
- Custom color input

Value rendering:

- `FillColorIndicator` was a filled circular chip with a subtle border.
- Value `none` used a checker/pattern background image instead of solid fill.
- `StrokeColorIndicator` was a circular ring SVG filled with the chosen stroke color and textured with a checkered base image underneath.

#### `DrawFillStyle`

Legacy implementation:

- `src/features/ContextPanel/Buttons/DrawFillStyle.tsx`

Dropdown structure:

- Same structure as `FillStyle`, but palette semantics were foreground-oriented.
- Highlighter selection converted picked colors to semi-transparent RGBA before applying.

#### `StickerFillStyle`

Legacy implementation:

- `src/features/ContextPanel/Buttons/StickerFillStyle.tsx`

Dropdown structure:

- `UiPanel columns={2} gap={4} padding={8}`
- `SemanticColorPicker variant="square"`
- Semantic palette only
- No circular chip treatment

Metadata implication:

- Color pickers in the old UI had at least two visual families:
  - circular semantic swatches
  - square sticker swatches

#### `StartPointer` / `EndPointer`

Legacy implementation:

- `src/features/ContextPanel/Buttons/StartPointer/StartPointer.tsx`
- `src/features/ContextPanel/Buttons/EndPointer/EndPointer.tsx`
- `src/features/Pickers/ConnectorPointerPicker/ConnectorPointerPicker.tsx`

Buttons:

- Peer buttons used `ConnectorPointerIcon` of the current start/end pointer.

Dropdown structure:

- Two-column grid of pointer options.
- `StartPointer`: `UiPanel grid gap={2} padding={2} columns={2}`
- `EndPointer`: `UiPanel grid padding={0} columns={2}`
- Picker contained 16 options in fixed order:
  - `None`
  - `ArrowBroad`
  - `ArrowThin`
  - `TriangleFilled`
  - `CircleFilled`
  - `Angle`
  - `TriangleEmpty`
  - `DiamondFilled`
  - `DiamondEmpty`
  - `Zero`
  - `One`
  - `Many`
  - `ManyMandatory`
  - `OneMandatory`
  - `ManyOptional`
  - `OneOptional`

Metadata implication:

- Connector endpoints were separate enum controls with icon-only option grids.

#### `ConnectorType`

Legacy implementation:

- `src/features/ContextPanel/Buttons/ConnectorType/ConnectorType.tsx`

Button:

- Peer button icon reflected current connector type via `ConnectorIcon`.

Dropdown structure:

- `UiPanel grid gap={8}`
- First block: `SliderPicker` for line width
- Second block: `ConnectorLineStylePicker`
- Third block: `StrokeStylePicker`

Control order was exact:

1. line width slider
2. connector path style picker
3. stroke pattern picker

Important contrast with toolbar connector menu:

- Toolbar connector menu only exposed connector path style.
- Context-panel connector dropdown was the richer editor.

Metadata implication:

- The old UI differentiated between tool-default editing and selected-item editing for connectors.

#### `FrameRatio`

Legacy implementation:

- `src/features/ContextPanel/Buttons/FrameRatio/FrameRatio.tsx`

Button:

- Single selected frame: showed plain text label such as `16 : 9`, `A4`, `Letter`, `Custom`
- Multi-select: showed generic `Frame` icon

Dropdown structure:

- `UiPanel grid columns={4} gap={4}`
- `FramePicker` items were compact vertical icon+label buttons
- Hovering an option previewed the frame shape on selected frames through `setNewShape`
- Leaving the menu cleared the preview

Metadata implication:

- This was not only an enum picker; it had transient hover-preview behavior.

#### `SpreadCards`

Legacy implementation:

- `src/features/ContextPanel/Buttons/CardGame/Deck/SpreadCards/SpreadCards.tsx`

Button:

- Peer icon button with `SpreadCards`

Dropdown structure:

- Vertical preset list reused `FontSizePicker`
- Values ran from `1` through `10`, then jumped to the deck size for larger decks
- No freeform input

Metadata implication:

- This was a preset-count chooser, not a text size control despite reusing the same picker component.

#### `ChangeRange` for dice

Legacy implementation:

- `src/features/ContextPanel/Buttons/CardGame/Dice/ChangeRange/ChangeRange.tsx`

Behavior:

- Not a dropdown menu.
- Two peer composite controls existed inline: one for min, one for max.
- Each control used direct value editing instead of a slider or plus/minus menu.

## 9. Related Menus and Popovers Reference

### Shape quick picker

- Data source: full `ShapePicker` for the active category
- Grid: 3 columns
- Height-clipped wrapper
- `Show all` button below
- Inline icons: `ShapeIcon`

### Connector tool defaults menu

- Exposed only line style
- Icon-only choices
- Vertical stack
- No secondary connector defaults surfaced there

### Sticker picker

- Two-column semantic color grid
- Square chips via `SquareColorItem`

### Frame picker

- Four-column grid
- Compact icon + label buttons

### Drawing launcher child menus

- Pen and highlighter: slider + color picker + custom color input
- Eraser: no submenu content

### Card creation modal

Legacy implementation:

- `src/features/GameItems/CreateCardsModal.tsx`

Entry point:

- Triggered from `AddCard` inside the game-items launcher.
- This was not a tool-activation overlay; it was a modal workflow.

Modal shell:

- `UiModal`
- `closeOnClickOutside={false}`
- `renderAsPageOnMobile={true}`

Content structure:

- Title
- Two large card-silhouette upload targets in one row:
  - cover image target
  - cards/front images target
- Confirm button at bottom

Behavior:

- Cover upload was single-file.
- Cards upload was multi-file.
- Both targets showed live image previews after selection.
- Cover image aspect ratio determined normalized card dimensions.
- Dimensions started from `conf.DEFAULT_GAME_ITEM_DIMENSIONS`.
- Dimensions were clamped by `conf.MAX_CARD_SIZE`.
- On confirm, the UI uploaded `[cover, ...cards]`.
- For each uploaded face image, the UI created a `Card` item with:
  - `backsideUrl = cover`
  - `faceUrl = that card image`
- New cards were pasted into the board near the viewport center.

Important product detail:

- Despite the helper name `createDeck`, the modal created loose `Card` items, not a `Deck` item.

Future-contract implication:

- Core will need a way to describe multi-step creation flows separately from simple one-click tools.

## 10. Menu Sizing and Alignment Reference

Toolbar menu base behavior from `src/features/ToolsPanel/Buttons/ButtonWithMenu/ButtonWithMenu.module.css`:

- `position: absolute`
- `left: calc(100% + 0.8rem)`
- `top: 0`

Implications:

- Toolbar menus opened to the right of the triggering button.
- Default anchor was top-aligned to the button.
- Width came from the menu content itself, not from a shared large minimum width.

Custom toolbar menu positioning:

- Drawing launcher applied an upward transform to offset the top alignment.
- Shape quick picker used its own fixed-height wrapper and clipped overflow.
- Frame, sticker, and connector menus relied on their content size and did not impose a broad minimum width.

Context-panel menu behavior from `UiButtonWithMenu.module.css`:

- Menus could open above or below depending on available space.
- Horizontal alignment could switch between right-of-button and right-anchored-to-panel.
- `middle` positioning used `top: 50%` and `transform: translateY(-50%)`.

Context menu rounded corners were also adjusted dynamically by `RestOptionsMenu`.

Floating-context dropdown sizing patterns:

- Font-size dropdowns were narrow content-fit vertical lists.
- Color pickers used compact 4-column or 2-column grids depending on control family.
- Connector pointer menus were compact 2-column icon grids.
- Frame menus sized to their 4-column preview grid.
- Connector type menus were wider because of the slider block plus two picker sections.

Visual distinction between compact and wide menus:

- Icon-only menus sized to their intrinsic grid.
- Mixed-content menus with sliders or text labels expanded only enough for those controls.
- The old UI did not apply one broad shared width across all overlay menus.

## 11. Overflow / Rest Menu Reference

Overflow was not generic metadata. It was explicitly curated per section.

Examples:

- Text/sticker/shape/AI node rest menus included link and duplicate actions.
- Connector rest menu omitted force-graph.
- Frame rest menu included frame navigation and export.
- Image rest menu included save-image.
- Deck/card rest menus were shorter and omitted unrelated commands.

The old UI therefore had two layers of ordering:

- explicit peer-button order in the main row
- explicit overflow placement in `RestOptionsMenu`

## 12. Exact Icon Usage Reference

### 12.1 Sprite-based icons

Most built-in overlay icons came from `src/shared/ui-lib/Icon/sprite.svg` and were rendered through `Icon.tsx` with `<use xlinkHref="#...">`.

Important built-in toolbar and context symbols present in the sprite:

- Toolbar shell:
  - `GameItems`
  - `Pen`
  - `Highlighter`
  - `Eraser`
  - `Text`
  - `Shape`
  - `Connector`
  - `Sticker`
  - `Frame`
- Text controls:
  - `TextStyle`
  - `TextBold`
  - `TextItalic`
  - `TextUnderline`
  - `TextStrike`
  - `TextAlignLeft`
  - `TextAlignCenter`
  - `TextAlignRight`
  - `VerticalAlignTop`
  - `VerticalAlignCenter`
  - `VerticalAlignBottom`
  - `TextColor`
  - `TextHighlight`
- Line/pattern controls:
  - `SolidLine`
  - `DashedLine`
  - `DottedLine`
  - `Switch`
  - `Chevron`
- Game-item/context controls:
  - `Dice`
  - `Card`
  - `Stack`
  - `RotateDice`
  - `RotateCard`
  - `ShuffleDeck`
  - `GetCard`
  - `GetBottomCard`
  - `GetRandomItem`
  - `SpreadCards`
  - `AddScreen`
  - `AddPouch`
  - `lock`
  - `unlock`

Color behavior of sprite symbols:

- The legacy built-in symbols were primarily monochrome.
- They generally used `fill="currentColor"` and, where needed, `stroke="currentColor"`.
- That means the React UI owned state coloring by setting CSS `color` on the icon wrapper/button.
- Core can safely own the raw SVG symbol definitions for these assets without owning the final button-state coloring.

### 12.2 Symbol families referenced indirectly by typed wrappers

Some picker icons were not referenced through `IconId` strings directly, but by typed wrapper components that still targeted the same local symbol sprite.

- `ShapeIcon`
  - wraps `<use xlinkHref="#{ShapeType}">`
  - symbols live in the local sprite and are keyed by exact shape type id
- `FrameIcon`
  - wraps `<use xlinkHref="#Frame{FrameType}">`
  - frame preview icons are sprite symbols prefixed with `Frame`
- `ConnectorIcon`
  - wraps `<use xlinkHref="#{ConnectorLineStyle}">`
  - connector-style picker options came from style ids such as `straight`, `curved`, `orthogonal`
- `ConnectorPointerIcon`
  - wraps `<use xlinkHref="#{ConnectorPointerType}">`
  - pointer endpoint previews came from pointer-style ids such as `ArrowBroad`, `DiamondFilled`, `OneOptional`

Metadata implication:

- Core icon ownership must include both:
  - named generic toolbar/context symbols
  - typed family symbol sets keyed by tool/item parameter values

### 12.3 Composite indicator icons

Several legacy overlay buttons were not plain static SVG symbols. They were React composites that layered a value indicator on top of a base symbol or chip.

- `TextColorIndicator`
  - base glyph: `TextColor`
  - dynamic value: bottom horizontal bar, `19px x 4px`
  - no indicator when color was `none`
- `TextHighlightIndicator`
  - base glyph: `TextHighlight`
  - dynamic value: small corner badge, `8px x 8px`, bordered
  - no indicator when color was `none`
- `FillColorIndicator`
  - no base glyph; just a filled circular chip
  - subtle border around chip
  - `none` rendered with a checker/pattern image fill
- `StrokeColorIndicator`
  - SVG ring/circle
  - fills the ring with selected color
  - overlays a contrasting stroke and checker texture so white/light colors remain visible
- `ConnectorSmartJump`
  - not one sprite asset
  - composed from `Switch` plus overlaid `lock` / `unlock`

Metadata implication:

- Core should not merely provide “icon id”.
- It will need to classify some controls as:
  - static symbol
  - symbol + value indicator
  - pure color chip
  - composite multi-symbol icon

### 12.4 Non-icon swatch representations

Not every picker option was a glyph.

- Most semantic color pickers used circular swatches from `ColorItem`
- Sticker color pickers used square swatches from `SquareColorItem`
- Frame picker options were icon + text
- Font-size and spread-card menus were text-only preset lists

This distinction matters for future metadata because “option has icon” and “option is represented by a swatch” were different UI categories in the old repo.

Top-level toolbar:

- `GameItems`
- `Pen` / `Highlighter` / `Eraser`
- `Text`
- `Shape` or specific `ShapeIcon`
- `Connector`
- `Sticker`
- `Frame`

Legacy picker/icon usage:

- Shape quick picker: `ShapeIcon`
- Connector type picker: `ConnectorIcon`
- Connector pointer pickers: `ConnectorPointerIcon`
- Stroke style picker: `SolidLine`, `DashedLine`, `DottedLine`
- Sticker colors: square chips, not icon glyphs
- Frame picker: `FrameIcon`

Legacy context examples:

- `SwitchPointers`: `Switch`
- `ConnectorSmartJump`: `Switch` with overlaid `lock` / `unlock`
- `FlipCard` / `FlipDeck`: `RotateCard`
- `ShuffleDeck`: `ShuffleDeck`
- `GetCard top`: `GetCard`
- `GetCard bottom`: `GetBottomCard`
- `GetCard random` and `GetRandomItem`: `GetRandomItem`
- `ThrowDice`: `RotateDice`
- `CreateDeck`: `Stack`

## 13. Remaining Contract Gaps For Core

The following remaining differences still require core metadata or contract support rather than more UI-only work.

### Connector toolbar defaults decomposition

Old behavior:

- toolbar connector menu only exposed line style selection

Current metadata:

- exposes line style, color, width, pattern, start/end arrows, smart jump as one defaults surface

Missing core support:

- a presentation contract distinguishing primary quick defaults from secondary/advanced defaults

### Sticker color picker visual shape

Old behavior:

- square sticker color chips

Current metadata:

- generic `color` editor with no picker-shape hint

Missing core support:

- presentation hint for color editor variant, for example `circle` vs `square`

### Shape quick-picker inline/basic scope

Old behavior:

- category-driven clipped grid sourced from the full shape taxonomy

Current metadata:

- five explicit inline options plus a catalog

Missing core support:

- a way to declare that the quick picker should derive from a category family rather than a short explicit inline subset

### Connector/context row decomposition

Old behavior:

- separate peer buttons for start arrow, switch, end arrow, connector type, smart jump, color, add text

Current metadata:

- `connector.switchPointers` plus a combined `connector.style` action

Missing core support:

- row decomposition / expose-as-peer-button presentation hints
- explicit connector `add text` metadata action

### Shape/context conditional fill visibility

Old behavior:

- `FillStyle` only for closed shapes

Current metadata:

- no value-dependent visibility contract for that action

Missing core support:

- minimal runtime visibility/applicability hinting based on item state

### Screen background-image conditional row behavior

Old behavior:

- peer-button set changed depending on whether `backgroundUrl` existed

Current metadata:

- no value-dependent visibility contract and no screen stroke action in overlay metadata

Missing core support:

- screen stroke metadata
- minimal state-based visibility for background-image actions
