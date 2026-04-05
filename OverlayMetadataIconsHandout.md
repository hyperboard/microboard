# UI Handout: Overlay Metadata Icons To Bring Across

## Phase Icon Contract

The UI should implement only these icon forms in this phase:

- `symbol`
- `asset` with SVG files
- optional `icon.state.swatch` rendering hint

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

## New Symbol Keys Added Or Required By Overlay Metadata

These symbol ids are referenced by current overlay metadata and should exist in the UI icon sprite or equivalent symbol registry:

- `connector.switchPointers`
- `connector.smartJump`

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
- symbol coverage for the keys above
- optional support for `icon.state.swatch`

It does not need:

- arbitrary inline SVG-from-metadata support
- tint-state logic
