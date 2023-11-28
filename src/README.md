# Board

To diagram add items to the board.

The Board contains all items inside of a spatial index to find them in space.

See [specification](./Board.spec.ts) for examples on how to add, edit and remove items from the board.

## Persistance

1. A User creates an instance of an item
2. A User adds the item to a board
3. The Board serializes the item and emits an operation to the Events
4. The Events creates a command and applies it to the Board
5. The Board creates an instance of an item and stores it in a spatial index.

The item id is a strigified connectionId+localId.
