# Operation Builder Pattern

## Purpose

This note proposes a cleaner pattern for creating item operations.

The immediate problem is that operation creation is currently spread across:

- item setter methods
- selection code
- tools
- ad hoc object literals

That makes mutation harder to read, harder to standardize, and harder to move toward the desired boundary:

- external code builds operations
- `item.apply(op)` performs the actual mutation

## Main design goals

We want a pattern where:

1. callers pass real items or item ids into small builder functions
2. the builder returns a correctly shaped operation
3. reverse or previous-state data is derived in one place when needed
4. callers do not hand-write operation objects inline
5. transformation is treated as item mutation, not as a public nested mutation surface

## Core rule

External code should build operations against items, not against nested implementation details.

Preferred:

```ts
const op = shapeOps.setBackgroundColor(shapes, color);
board.events.applyAndEmit(op);
```

Not preferred:

```ts
selection.emit({
  class: "Shape",
  method: "setBackgroundColor",
  item: shapeIds,
  backgroundColor: color,
});
```

Also not preferred:

```ts
item.transformation.translateBy(x, y);
```

Longer term, transformation should stop being an editor-facing public mutation surface and should become an item-owned implementation detail.

## Proposed interface shape

The simplest useful pattern is a family of builder modules.

Examples:

- `shapeOps`
- `frameOps`
- `connectorOps`
- `transformOps`
- later, shared helpers for common field-style operations

Each builder function should:

- accept item objects or ids
- normalize them to ids internally
- attach required payload
- attach previous-state data only where the command/reverse path requires it
- return a typed operation object

## Proposed TypeScript shape

```ts
type ItemLike = { getId(): string };

type ItemOrId = ItemLike | string;

function idsOf(items: readonly ItemOrId[]): string[] {
  return items.map((item) => typeof item === "string" ? item : item.getId());
}
```

```ts
export const shapeOps = {
  setShapeType(items: readonly (Shape | string)[], shapeType: ShapeType): ShapeOperation {
    return {
      class: "Shape",
      method: "setShapeType",
      item: idsOf(items),
      shapeType,
    };
  },

  setBackgroundColor(items: readonly (Shape | string)[], backgroundColor: ColorValue): ShapeOperation {
    return {
      class: "Shape",
      method: "setBackgroundColor",
      item: idsOf(items),
      backgroundColor,
    };
  },

  setBorderWidth(items: readonly Shape[], borderWidth: number): ShapeOperation {
    return {
      class: "Shape",
      method: "setBorderWidth",
      item: idsOf(items),
      borderWidth,
      prevBorderWidth: items[0]?.getBorderWidth() ?? 0,
    };
  },
};
```

```ts
export const transformOps = {
  translateBy(items: readonly Item[], x: number, y: number, timeStamp?: number): TransformationOperation {
    return {
      class: "Transformation",
      method: "applyMatrix",
      items: items.map((item) => ({
        id: item.getId(),
        matrix: {
          translateX: x,
          translateY: y,
          scaleX: 1,
          scaleY: 1,
          shearX: 0,
          shearY: 0,
        },
      })),
      timeStamp,
    };
  },

  setLocalPreview(item: Item, matrix: MatrixData): TransformationOperation {
    return {
      class: "Transformation",
      method: "applyMatrix",
      items: [{ id: item.getId(), matrix }],
    };
  },
};
```

## Why builder functions are better

### 1. They remove handwritten operation literals from the call sites

That makes selection, tools, and item families much easier to read.

### 2. They centralize payload shape

If a payload changes, one builder changes instead of many random object literals.

### 3. They centralize reverse-related data

Fields like `prevBorderWidth` or `prevShapeType` should be computed in the builder, not repeated across UI code.

### 4. They make migration away from setter APIs easier

Callers can move from:

- `item.setBackgroundColor(color)`

to:

- `board.events.applyAndEmit(shapeOps.setBackgroundColor([item], color))`

without inventing the payload themselves.

### 5. They support the item-owned transformation boundary

Once callers build transform operations against items rather than directly mutating `item.transformation`, we can later hide `transformation` behind the item boundary with much less churn.

## Transformation boundary proposal

### Current problem

Today, many callers mutate:

- `item.transformation.setLocal(...)`
- `item.transformation.translateBy(...)`
- `item.transformation.scaleBy(...)`

This leaks an internal nested object as if it were the public write API.

That makes it harder to guarantee that all mutation goes through `item.apply(op)`.

### Target direction

The public mutation boundary should be the item, not the nested `Transformation`.

Desired conceptual direction:

```ts
const op = transformOps.translateBy(items, dx, dy, timeStamp);
board.events.applyAndEmit(op);
```

and for preview:

```ts
draftItem.apply(transformOps.translateBy([draftItem], dx, dy));
```

At that point, item mutation still reaches transformation logic internally, but the caller no longer knows or cares whether transformation is implemented by:

- a nested class
- direct fields on the item
- a future internal helper

### Important clarification

This does not require deleting the `Transformation` class immediately.

Near term:

- keep `Transformation` as an internal helper
- stop expanding its use as a public editor-facing write surface
- move callers toward item-based transform operation builders

Later:

- make `transformation` private or effectively private
- expose read-only accessors on the item as needed
- keep all write paths item-owned

### Interface guideline for transform writes

Prefer builder names that describe the intent in item terms:

- `transformOps.translateBy(items, x, y)`
- `transformOps.scaleBy(items, x, y)`
- `transformOps.applyMatrix(items, matrices)`

Avoid designing new editor-facing code around:

- `item.transformation.translateBy(...)`
- `item.transformation.setLocal(...)`
- `item.transformation.emit(...)`

## Emission guideline

Operation builders should only build operations.

They should not:

- apply the operation
- emit the event
- decide between preview vs durable

That separation keeps the interface simple:

- builders build
- callers choose preview or durable
- `item.apply(op)` performs the mutation

Example:

```ts
const op = connectorOps.setEndPoint([connector], point);

// durable
board.events.applyAndEmit(op);

// preview
connector.apply(op);
```

## Reverse-data guideline

There are two categories of operations.

### Self-reversible operations

These do not need previous state from the builder because reverse can be derived structurally.

Examples:

- `Transformation.applyMatrix`
- `Transformation.translateBy`
- some swap-style operations

### Snapshot-requiring operations

These do need previous state attached explicitly.

Examples:

- `Shape.setBorderWidth`
- `Frame.setFrameType`
- any operation whose reverse depends on the prior field value

For these, the builder should gather previous state from the items once and attach it in a consistent way.

## Recommendation on payload shape

For snapshot-requiring operations, prefer a payload that is explicit and symmetrical.

Better direction:

```ts
{
  class: "Shape",
  method: "setBorderWidth",
  item: ["a", "b"],
  next: { borderWidth: 2 },
  prev: { borderWidth: 1 },
}
```

Current codebase reality means we may keep older field names for a while, but new builder APIs should move toward a consistent `next` / `prev` pattern where practical.

## Universal property-op direction

For a large class of mutations, we should be able to move toward a universal operation format that carries:

- item ids
- property name
- previous value
- next value

Example:

```ts
{
  class: "Shape",
  item: ["a", "b"],
  property: "borderWidth",
  prev: 1,
  next: 2,
}
```

Or, if we want to support several fields at once:

```ts
{
  class: "Shape",
  item: ["a", "b"],
  changes: [
    { property: "borderWidth", prev: 1, next: 2 },
    { property: "borderColor", prev: "#000", next: "#f00" },
  ],
}
```

### Why this is attractive

This would reduce the need for command-time reverse construction from live state.

For those operations:

- the operation already contains its undo data
- replay becomes more self-contained
- command creation becomes simpler
- caller intent becomes more obvious

This is especially appealing for the current setter-heavy parts of the codebase.

### Important limit

This should be treated as the default format for ordinary property mutation, not as the only operation shape for the whole engine.

It is a good fit for:

- colors
- widths
- style flags
- booleans
- simple item configuration fields
- link-like property changes

It is not a natural fit for:

- text / Slate operations
- add/remove/reparent child structure
- cross-item repair logic
- procedural operations whose effect is more than “set property X from A to B”
- complex transform and hierarchy cases, at least not initially

So the realistic target is:

- universal property ops for normal field mutation
- specialized operation families for structural or procedural cases

### Relationship to typed helpers

The cleanest authoring model is still:

- typed helper operates on real item instances
- helper computes `prev` and `next`
- helper returns a normalized property op

Preferred authoring shape:

```ts
const op = setField(shapes, shapeFields.borderWidth, 2);
```

Possible normalized runtime shape:

```ts
{
  class: "Shape",
  item: ["a", "b"],
  property: "borderWidth",
  prev: 1,
  next: 2,
}
```

This keeps type safety at the call site while still moving runtime operations toward a universal schema.

### Sequential command construction

One reason to move in this direction is to remove the current requirement that commands discover reverse state sequentially from live objects.

For universal property ops:

- reverse data should be authored before emission
- command logic should mostly become mechanical
- undo should no longer depend on rereading current object state for those fields

This would be a meaningful simplification of the command layer.

### Recommended adoption strategy

Do not try to convert every operation family at once.

Start with:

- shape style fields
- frame property fields
- connector style fields

Only after the property-op pattern is working there should we evaluate whether:

- transform values can be partially represented this way
- some `BaseItem` fields can join the same model

Text, hierarchy, and cross-item repair should remain separate until their semantics are clearer.

## Recommended first migration step

Start without changing the entire operation schema.

Phase 1:

- introduce builder modules that return the current operation shapes
- move selection and tools to use them
- stop adding new inline operation literals

Phase 2:

- route more preview code through `item.apply(builder(...))`
- reduce direct calls to nested transformation mutators

Phase 3:

- make item transformation writes builder-driven by default
- narrow public visibility of direct transformation mutation methods

Phase 4:

- consider normalizing payload shape around `prev` / `next`
- consider making transformation private or effectively private

## Suggested initial builder set

The first useful builder modules are:

- `transformOps`
- `shapeOps`
- `frameOps`
- `connectorOps`

The first builder functions should cover the most repeated patterns:

- translate / applyMatrix
- shape background, border, type
- frame type and ratio flag
- connector endpoint and line style

## What success looks like

This pattern is working when:

- most new code no longer hand-writes operation objects
- selection and tools call builders instead of item setters
- preview code increasingly uses `item.apply(op)` with builder-created operations
- transformation writes stop going directly through `item.transformation` from editor-facing code
- item mutation becomes easier to read because each call site expresses intent rather than payload wiring
