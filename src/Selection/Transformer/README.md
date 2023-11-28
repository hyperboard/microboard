# Transformer

The `Transformer` class implements the `Tool` interface and is used to transform items on the board. It uses `TransformerStrategy` interface to transform the item.

The `Transformer` `Tool` transforms a `Rectangle`. Then it applies the transformation to the items through the TransformationStrategy.

The `Transformer` can force a proportional transformation of the `y` axis based on items in the selection.

The `Transformer` can change the cursors map on the board to display appropriate cursors for its anchors based on items in the selection.

## Transformer Anchors

Corner scales x and y axis of the `Rectangle`.

The corner can also translate the `Rectangle` so that the opposite corner stays in its place. (not necessary only for the bottom right corner)

The opposites:

| top right | bottom left |
| top left | bottom right |

The left and right edges of the `Rectangle` scale its x axis.

The top and bottom edges scale its y axis.

The left and top edges translate the `Rectangle` so that its opposite edge stays in place.

## Transformer Strategy

The `TransformerStrategy` interface has `scale` and `rotate` methods that transforms an item using a transformation.

### Shape Strategy

Shape can be scaled non proportionally. This changes the scale of the text `Transformation`.

### Text Strategy

Text can be scaled by the `x` axis. This changes the `Mbr` of the text container.

Text can only be scaled by the `y` axis proportionally with the `x` axis. This changes the scale of the text `Transformation`.

### Connector Strategy

Connector can be scaled non proportionally. This changes the connector board points.
