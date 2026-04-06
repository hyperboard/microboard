# UI Handout: Overlay Metadata Icons To Bring Across

## Phase Icon Contract

The UI should implement only these icon forms in this phase:

- `symbol`
- `asset` with SVG files
- optional `icon.state.swatch` rendering hint

For built-in core metadata, `symbol` now carries a core-owned `sourcePath` pointing at the sprite shipped by this repo:

- [src/Overlay/overlay-icons.svg](/home/alex/microboard/hyperboard/microboard/src/Overlay/overlay-icons.svg)

Do not implement for this phase:

- inline metadata `svg`
- `icon.state.tint`

## Asset Icons Currently Referenced By Metadata

These paths are used directly by overlay metadata and should be supported by the UI asset-loading path:

- [src/Items/Shape/Basic/Rectangle/Rectangle.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Rectangle/Rectangle.icon.svg)
- [src/Items/Shape/Basic/RoundedRectangle/RoundedRectangle.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/RoundedRectangle/RoundedRectangle.icon.svg)
- [src/Items/Shape/Basic/Circle/Circle.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Circle/Circle.icon.svg)
- [src/Items/Shape/Basic/Triangle/Triangle.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Triangle/Triangle.icon.svg)
- [src/Items/Shape/Basic/Rhombus/Rhombus.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Rhombus/Rhombus.icon.svg)
- [src/Items/Shape/Basic/ArrowLeft/ArrowLeft.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/ArrowLeft/ArrowLeft.icon.svg)
- [src/Items/Shape/Basic/ArrowRight/ArrowRight.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/ArrowRight/ArrowRight.icon.svg)
- [src/Items/Shape/Basic/ArrowLeftRight/ArrowLeftRight.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/ArrowLeftRight/ArrowLeftRight.icon.svg)
- [src/Items/Shape/Basic/Cloud/Cloud.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Cloud/Cloud.icon.svg)
- [src/Items/Shape/Basic/Cross/Cross.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Cross/Cross.icon.svg)
- [src/Items/Shape/Basic/Cylinder/Cylinder.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Cylinder/Cylinder.icon.svg)
- [src/Items/Shape/Basic/Hexagon/Hexagon.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Hexagon/Hexagon.icon.svg)
- [src/Items/Shape/Basic/Octagon/Octagon.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Octagon/Octagon.icon.svg)
- [src/Items/Shape/Basic/Parallelogram/Parallelogram.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Parallelogram/Parallelogram.icon.svg)
- [src/Items/Shape/Basic/Pentagon/Pentagon.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Pentagon/Pentagon.icon.svg)
- [src/Items/Shape/Basic/SpeachBubble/SpeachBubble.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/SpeachBubble/SpeachBubble.icon.svg)
- [src/Items/Shape/Basic/Star/Star.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Star/Star.icon.svg)
- [src/Items/Shape/Basic/Trapezoid/Trapezoid.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/Trapezoid/Trapezoid.icon.svg)
- [src/Items/Shape/Basic/BracesLeft/BracesLeft.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/BracesLeft/BracesLeft.icon.svg)
- [src/Items/Shape/Basic/BracesRight/BracesRight.icon.svg](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Basic/BracesRight/BracesRight.icon.svg)

## Core-Owned Symbol Sprite

The UI should first try to render `symbol` icons from `icon.sourcePath` when it is present.

That means built-in overlay icons no longer depend on the old UI-local sprite as their source of truth.

The core sprite now contains the symbol ids used by current overlay metadata, including:

- tool icons such as `tool.pen`, `tool.connector`, `tool.sticker`, `tool.frame`, `tool.text`, `tool.dice`, `tool.screen`, `tool.pouch`
- action icons such as `deck.drawTop`, `deck.shuffle`, `card.flip`, `dice.throw`, `screen.backgroundImage`
- editor/family icons such as `connector.lineStyle.*`, `connector.pointer.*`, `stroke.*`, `frame.*`, `shape.bpmn.*`

It also includes a small compatibility subset of legacy ids like `Pen`, `Highlighter`, `Eraser`, `Text`, `Shape`, `Connector`, `Sticker`, `Frame`, `Dice`, `AddScreen`, `AddPouch`, `Switch`, `RotateDice`, `ShuffleDeck`, `GetCard`, `GetBottomCard`, `GetRandomItem`, and `Stack`.

## Existing Dynamic Swatch Hints Used By Metadata

The UI can optionally render color state from:

- shape fill: `item.backgroundColor`
- screen background: `item.backgroundColor`
- dice fill: `item.backgroundColor`
- sticker tool: `tool.backgroundColor`
- drawing tool: `tool.strokeColor`
- highlighter tool: `tool.strokeColor`
- connector tool: `tool.lineColor`

## Practical UI Requirement

To complete this phase, the UI repo needs:

- asset-path rendering for SVG icons
- `symbol.sourcePath` support for core-owned sprites
- optional support for `icon.state.swatch`

It does not need:

- arbitrary inline SVG-from-metadata support
- tint-state logic
