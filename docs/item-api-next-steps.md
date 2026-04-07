# Item API Next Steps

## Context

The current architecture is already moving in the right direction:

- item and tool capabilities are described through overlay metadata
- mutations are gradually moving toward operation-based flows
- UI is being decoupled from item-specific knowledge
- built-in items are being aligned with a shared contract that future custom items should also follow

At the same time, recent `Drawing` bugs exposed an important gap:

- the architecture assumes a more standardized item creation contract than the built-in flows currently guarantee
- some built-in items still rely on older ad hoc creation paths
- that means the engine is not yet at the point where a future user-defined item could safely rely on one clear, stable creation API

This document summarizes the practical next steps.

## Main Conclusion

There are two different tasks:

1. fix built-in items so they obey the current contract
2. design and expose a stable public item creation API

Both are needed, but they solve different problems.

## What The `Drawing` Bugs Actually Showed

The recent `Drawing` issues were not evidence that the new architecture is wrong.

They showed that one built-in flow was still partially legacy:

- a draft `Drawing` was created in an empty intermediate state that the item did not fully tolerate
- finalization created item data with `points` only, but without the full `transformation` payload expected by `deserialize()`

This means:

- `Drawing` itself was not fully aligned with the newer item data contract
- one built-in tool path still relied on implicit knowledge instead of a complete standardized creation flow

In other words:

- this was a built-in implementation inconsistency
- not a reason to abandon the standardization effort

## Short-Term Recommendation

### 1. Continue fixing built-in items first

Before exposing a future public API for custom items, built-in items should stop relying on special internal shortcuts.

Practical rule:

- every built-in item creation path should be valid under the same contract a future custom item would need to satisfy

For `Drawing`, that means:

- empty draft states must be valid
- `deserialize()` inputs must be complete enough for the declared contract
- tools must stop constructing partial item data "by memory"

This work should be repeated for other built-ins where needed.

### 2. Treat current bugs as contract-audit signals

When a built-in item breaks during creation, preview, serialization, deserialization, or selection editing, that should be interpreted as:

- "the shared item contract is not fully enforced here yet"

That is useful information during this phase.

## Medium-Term Recommendation

### 3. Define one standard item creation path

The engine should move away from hand-assembled item data objects in tools and feature code.

Future target:

- callers should not need to know every required field of `deserialize()`
- callers should not build partial item payloads directly

Instead, there should be one supported creation layer.

## Recommended Public API Direction

The cleanest direction is a small set of stable helpers such as:

```ts
createItem({ itemType, props })
```

and/or

```ts
createDefaultItemData(itemType)
```

and possibly a draft-oriented helper such as:

```ts
createDraftItem({ itemType, props })
```

The exact names are less important than the boundary they provide.

## Why A Factory Layer Is Better

### 1. It removes hidden required-field knowledge

Without a factory/helper layer, callers need to know details like:

- which properties are required
- which properties have defaults
- whether `transformation` must always be present
- whether a draft item is allowed to be partially initialized

That is exactly the kind of hidden knowledge that will make custom item authoring fragile.

### 2. It makes built-in and custom items follow the same rules

If built-in items are created through the same creation layer that future custom items will use, then:

- internal code becomes a real test of the public contract
- future plugin authors no longer depend on undocumented conventions

### 3. It reduces `deserialize()` misuse

`deserialize()` should ideally mean:

- "apply complete serialized item data"

It should not be used as an informal half-constructor for incomplete item payloads unless that behavior is intentionally supported and documented.

## Preferred Contract Split

### `deserialize()`

Best used for:

- loading snapshots
- applying serialized state
- reconstructing full item data

### factory / create helpers

Best used for:

- creating a new item with defaults
- creating a draft item for tools
- creating a user-defined item from high-level props

This split will make the system easier to reason about.

## Open Design Choice

There are two valid directions for missing fields:

### Option A: tolerant `deserialize()`

`deserialize()` could accept partial data and fill defaults internally.

Pros:

- less fragile in the short term
- easier migration for existing built-in flows

Cons:

- blurs the meaning of serialization vs creation
- makes it easier for callers to depend on implicit fallback behavior

### Option B: strict `deserialize()`, tolerant factory

`deserialize()` stays strict and expects complete item data.

Creation helpers provide defaults and normalize partial user input before the item sees it.

Pros:

- clearer contract
- better long-term API design
- easier to document for future custom item authors

Cons:

- requires more upfront refactoring of built-in flows

Recommended direction:

- prefer strict `deserialize()` plus tolerant creation helpers

## Suggested Implementation Order

1. Audit built-in item creation flows for partial or implicit data assembly.
2. Fix built-in flows so they stop violating the current item data contract.
3. Decide whether `deserialize()` should remain strict or only minimally tolerant.
4. Introduce one factory/helper layer for item creation.
5. Migrate built-in tools to that helper layer.
6. Only after that, expose the same path as the supported API for user-defined items.

## Practical Test For Readiness

The engine is ready for a real public custom-item creation API when this statement becomes true:

- a built-in item can be created, previewed, finalized, serialized, deserialized, and edited without relying on any item-specific hidden knowledge outside the standardized contract

If that is true for built-ins, then the same path is realistic for future custom items.

If that is not true yet, the architecture is still in the standardization phase rather than the public API phase.

## Final Position

The current work is still the right work.

The immediate goal is not:

- "ship public custom item creation today"

The immediate goal is:

- align built-in items with the standardized contract
- remove legacy internal shortcuts
- make core metadata and item mutation boundaries trustworthy

Once that is done, a future public creation API like `createItem(...)` becomes much safer, clearer, and easier to support.
