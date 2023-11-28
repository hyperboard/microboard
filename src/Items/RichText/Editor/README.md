# Rich Text Editor

Rich Text is a tree from Block Nodes and Text Nodes.

All Text Nodes must be inside of Block Nodes.

Some Block Nodes can be inside of other Block Nodes.

## Text Nodes

Text Node is a string of text with a font of specific family, size, color, highlight and a list of styles (bold, italic, oblique etc.)

## Block Nodes

Block Node is a list of child nodes. Block Node has a specific type (paragraph, heading, ordered list etc.).

Inside of list block nodes there can be other list block nodes.

## Operations

Before editor applies its operation we capture it and emit to the Events.

Later we apply the operation with the original apply method.
