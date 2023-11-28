# Selection

## Operations

Now Selection operations double operations from other classes.

For example this Selection operation

```typescript
export interface ScaleBy {
	class: "Selection";
	method: "scaleBy";
	items: string[];
	x: number;
	y: number;
	revertMap?: { [key: string]: Point };
}
```

Doubles this Transformation operation

```typescript
interface ScaleBy {
	class: "Transformation";
	method: "scaleBy";
	item: string;
	x: number;
	y: number;
}
```

There are only two differences:

1. the Selection operation is applied to a list of items
2. the Selection operation can have a map of previous values

We can merge Selection operations with operations that they double.

## Setters

We need to reuse setters from items instead of reimplementing them in selection.

For each item class create a new separate class for emitting operations with the same setter methods as that item class. Each setter method should accept a list of items in addition to all the parameters that it allready has and emit an operation to the Events module.

Collect all such emmiter classes in one emmiter class and expose that class from the board. So that we could emit new operations like this:

```typescript
board.emit.shapes.setBackgroundColor("red");
board.emit.transformations.translateBy(10, 20);
```

From each item class remove everything related to operations. Make setter that actually set the values on an item. Move the apply method into its corresponding command and call the item setters from it. Make each command able to apply and revert operations to a list of items.

Add a method on selection to list types of items in it.

## Apply

We need to make the apply method polymorhic for each other items operations instead of checking items type to dispatch operations to apply of fitting class.

## Tools

Selection implements the 'State' pattern to activate tools that work on the selected items.
