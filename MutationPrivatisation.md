# Mutation Privatization Feasibility Report

## A. Executive Summary

**Can we privatize mutation methods?** Yes, with prep.

The codebase already has a de facto durable mutation path:

`emit/applyAndEmit -> command.apply -> item.apply`

That path is used for local edits, undo/redo, and replay through `Board.apply()` and `Events.applyAndEmit()`:

- [src/Events/Events.ts](/home/alex/microboard/hyperboard/microboard/src/Events/Events.ts#L97)
- [src/Events/Events.ts](/home/alex/microboard/hyperboard/microboard/src/Events/Events.ts#L135)
- [src/Board.ts](/home/alex/microboard/hyperboard/microboard/src/Board.ts#L158)
- [src/Board.ts](/home/alex/microboard/hyperboard/microboard/src/Board.ts#L334)

The main issue is not the absence of a canonical durable path. The issue is that several other mutation entrypoints remain public and are used in parallel.

### Top 3 blockers

1. Public local mutators are heavily used outside the durable path, especially `Transformation.setLocalMatrix()`, `Transformation.setLocal()`, and direct `item.apply(...)`.
2. Cross-item and container side effects are embedded inside item mutation methods, especially shape-to-connector, frame/group nesting, and deck/card reparenting.
3. Text uses a separate Slate-driven mutation flow where edits are applied before command/logging, and several commands still compute reverse state from live objects.

## B. Mutation Inventory

### 1. Durable mutation entrypoints

These are the current durable, history-bearing paths.

#### Board-level durable operations

- `Board.emit()` applies a `BoardCommand` and logs it.
- Used for add/remove/z-order/group-like operations.

References:

- [src/Board.ts](/home/alex/microboard/hyperboard/microboard/src/Board.ts#L118)
- [src/BoardCommand.ts](/home/alex/microboard/hyperboard/microboard/src/BoardCommand.ts#L1)

#### Generic event path

- `Events.emit()` logs an operation plus command.
- `Events.applyAndEmit()` is the cleanest canonical helper for durable mutation.

References:

- [src/Events/Events.ts](/home/alex/microboard/hyperboard/microboard/src/Events/Events.ts#L97)
- [src/Events/Events.ts](/home/alex/microboard/hyperboard/microboard/src/Events/Events.ts#L135)

#### Item-level emitters

Most items expose their own emitter wrappers:

- `BaseItem.emit()`
- `Shape.emit()`
- `Frame.emit()`
- `Connector.emit()`
- `Sticker.emit()`
- `Drawing.emit()`
- `Transformation.emit()`
- `LinkTo.emit()`

References:

- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L453)
- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L128)
- [src/Items/Frame/Frame.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Frame/Frame.ts#L500)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L360)
- [src/Items/Sticker/Sticker.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Sticker/Sticker.ts#L153)
- [src/Items/Transformation/Transformation.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Transformation/Transformation.ts#L177)
- [src/Items/LinkTo/LinkTo.ts](/home/alex/microboard/hyperboard/microboard/src/Items/LinkTo/LinkTo.ts#L26)

#### Selection-built durable operations

Selection often bypasses item convenience methods and constructs operations directly:

- bulk transformation via `transformMany()`
- bulk style operations
- bulk text operations

References:

- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L1069)
- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L1130)
- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L1287)

### 2. Local-only mutation entrypoints

These mutate state without durable logging and are used for preview, setup, nesting, or internal repair.

#### Transformation local helpers

- `Transformation.setLocalMatrix()`
- `Transformation.setLocal()`

These are explicitly local setters and publish to subscribers without logging.

Reference:

- [src/Items/Transformation/Transformation.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Transformation/Transformation.ts#L48)

#### Direct `apply(...)` calls on items

Tools use direct `item.apply(...)` for local preview/setup:

- `AddShape`
- `AddFrame`
- `AddConnector`

References:

- [src/Tools/AddShape/AddShape.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddShape/AddShape.ts#L73)
- [src/Tools/AddFrame/AddFrame.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddFrame/AddFrame.ts#L238)
- [src/Tools/AddConnector/AddConnector.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddConnector/AddConnector.ts#L186)

#### Internal apply helpers

- `applyAddChildren()`
- `applyRemoveChildren()`
- `applyStartPoint()`
- `applyEndPoint()`
- `applyMiddlePoint()`

These are used by deserialization, replay setup, and preview flows.

References:

- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L346)
- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L383)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L452)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L483)

### 3. Editor-driven mutation entrypoints

Text is a special case and already behaves differently.

- Slate operations are applied locally in the editor first.
- `EditorContainer` records Slate ops and emits `RichText.edit` afterward.
- `RichText.emitWithoutApplying()` logs without pre-applying via command.

References:

- [src/Items/RichText/EditorContainer.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/EditorContainer.ts#L148)
- [src/Items/RichText/EditorContainer.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/EditorContainer.ts#L205)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L554)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L561)

### 4. Derived-state-only mutation/reactivity

These do not define durable state by themselves; they respond to it.

- item subscriptions recompute geometry, layout, and publish
- selection subscribes to item subjects
- spatial indexes subscribe to item subjects

References:

- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L85)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L140)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L161)
- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L209)
- [src/SpatialIndex/SpacialIndex.ts](/home/alex/microboard/hyperboard/microboard/src/SpatialIndex/SpacialIndex.ts#L116)

## C. Current Canonical Mutation Path

### De facto durable path today

The main durable path is:

1. caller creates an operation
2. caller uses `emit(...)` or `events.applyAndEmit(...)`
3. command applies the operation
4. `item.apply(op)` performs the actual mutation
5. events log and publish the operation

References:

- [src/Events/Events.ts](/home/alex/microboard/hyperboard/microboard/src/Events/Events.ts#L97)
- [src/Events/Events.ts](/home/alex/microboard/hyperboard/microboard/src/Events/Events.ts#L135)
- [src/Board.ts](/home/alex/microboard/hyperboard/microboard/src/Board.ts#L334)
- [src/Events/BaseCommand.ts](/home/alex/microboard/hyperboard/microboard/src/Events/BaseCommand.ts#L23)

### Can `BaseItem.apply()` become the single entrypoint?

**Not by itself.**

`BaseItem.apply()` is only a shared dispatcher for:

- transformation ops
- link ops
- base item ops like child membership and resize-enabled flags

Subclass-specific durable behavior still lives in subclass `apply()` methods:

- `Shape.apply()`
- `Frame.apply()`
- `Connector.apply()`
- `Sticker.apply()`

References:

- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L521)
- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L204)
- [src/Items/Frame/Frame.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Frame/Frame.ts#L472)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L383)

### Realistic conclusion

For **non-text durable mutations**, `item.apply(op)` can realistically become the single durable apply boundary.

But `BaseItem.apply()` alone cannot be that boundary without another dispatch layer or larger refactor.

## D. Blockers To Privatizing Mutation Methods

### 1. Public transformation mutators are used broadly

**Severity:** High

`Transformation` exposes both durable and local methods publicly, and many external callers depend on them.

Examples:

- single-item move in selection uses `item.transformation.translateBy(...)`
- preview tools use `setLocal(...)`
- resizing helpers call `translateBy(...)` and `scaleByTranslateBy(...)`
- examples/hotkeys call `translateTo(...)`

References:

- [src/Tools/Select/Select.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/Select/Select.ts#L242)
- [src/Tools/AddShape/AddShape.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddShape/AddShape.ts#L61)
- [src/Tools/AddFrame/AddFrame.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddFrame/AddFrame.ts#L213)
- [src/Tools/CustomTool.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/CustomTool.ts#L64)
- [src/Selection/Transformer/TransformerHelpers/transformRichText.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Transformer/TransformerHelpers/transformRichText.ts#L81)
- [src/Selection/Transformer/TransformerHelpers/transformAINode.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Transformer/TransformerHelpers/transformAINode.ts#L45)
- [src/Items/Transformation/Transformation.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Transformation/Transformation.ts#L54)
- [src/Items/Transformation/Transformation.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Transformation/Transformation.ts#L64)

Making these private immediately would break tools, helpers, and special items.

### 2. Preview tools depend on direct non-durable mutation

**Severity:** High

Several tools create draft items, mutate them locally for preview, and only later call `board.add(...)`.

Examples:

- `AddShape` directly calls `shape.apply(...)` and `shape.transformation.setLocal(...)`
- `AddFrame` directly calls `frame.apply(...)`, `frame.transformation.setLocal(...)`, `frame.applyAddChildren(...)`
- `AddConnector` directly calls `connector.applyEndPoint(...)` and `connector.apply(...)`
- `CustomTool` mutates draft item transforms directly

References:

- [src/Tools/AddShape/AddShape.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddShape/AddShape.ts#L61)
- [src/Tools/AddShape/AddShape.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddShape/AddShape.ts#L73)
- [src/Tools/AddFrame/AddFrame.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddFrame/AddFrame.ts#L213)
- [src/Tools/AddFrame/AddFrame.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddFrame/AddFrame.ts#L229)
- [src/Tools/AddFrame/AddFrame.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddFrame/AddFrame.ts#L238)
- [src/Tools/AddConnector/AddConnector.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddConnector/AddConnector.ts#L99)
- [src/Tools/AddConnector/AddConnector.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/AddConnector/AddConnector.ts#L186)
- [src/Tools/CustomTool.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/CustomTool.ts#L61)
- [src/Tools/CustomTool.ts](/home/alex/microboard/hyperboard/microboard/src/Tools/CustomTool.ts#L150)

These are legitimate local-only flows, so they should not be forced through durable logging. They need an explicit internal preview API.

### 3. Cross-item side effects are embedded inside item mutation methods

**Severity:** High

Some item mutations are not self-contained.

#### Shape -> connector coupling

Changing shape type repositions connected connector endpoints by calling connector mutators.

Reference:

- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L260)

#### Frame/group/container coupling

Container operations rewrite parentage and local transforms directly.

References:

- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L346)
- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L383)
- [src/Items/Frame/Frame.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Frame/Frame.ts#L569)
- [src/Items/Group/Group.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Group/Group.ts#L61)

#### Deck/card example logic

Deck directly rewrites child transforms and parent fields.

Reference:

- [src/Items/Examples/CardGame/Deck/Deck.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Examples/CardGame/Deck/Deck.ts#L70)

These couplings block strict privatization because other objects currently depend on mutating siblings or children directly.

### 4. Text uses a separate mutation model

**Severity:** High

Text edits are applied in Slate first, then emitted as `RichText` operations. This is already intentionally different from normal item command flow.

References:

- [src/Items/RichText/EditorContainer.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/EditorContainer.ts#L148)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L554)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L601)

This should remain a special case for now.

### 5. Reverse computation still depends on live state

**Severity:** Medium

Several commands compute reverse operations from current object state instead of from fully self-contained operation payloads.

Examples:

- `BaseCommand`
- `ShapeCommand`
- `RichTextCommand`

References:

- [src/Events/BaseCommand.ts](/home/alex/microboard/hyperboard/microboard/src/Events/BaseCommand.ts#L43)
- [src/Items/Shape/ShapeCommand.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/ShapeCommand.ts#L34)
- [src/Items/RichText/RichTextCommand.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichTextCommand.ts#L39)

This does not block unification completely, but it does block a clean internal boundary where mutation methods can become narrow and non-observable.

### 6. Deserialization and replay depend on internal apply helpers

**Severity:** Medium

Board snapshot loading directly calls:

- `applyStartPoint`
- `applyEndPoint`
- `applyAddChildren`

References:

- [src/Board.ts](/home/alex/microboard/hyperboard/microboard/src/Board.ts#L762)
- [src/Board.ts](/home/alex/microboard/hyperboard/microboard/src/Board.ts#L808)

These are not user-facing APIs, but they must remain available internally.

### 7. Some classes duplicate emit/apply wrappers

**Severity:** Low

There is repeated logic across item classes for:

- create command
- apply command
- emit event

References:

- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L128)
- [src/Items/Frame/Frame.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Frame/Frame.ts#L500)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L360)

This is duplication, but not a direct blocker.

## E. Publication And Subscriptions Analysis

### What exists because mutation is uncontrolled?

A meaningful amount of republishing/repair logic exists because code can mutate objects from many places:

- local `setLocal()` publishes transformation updates without durable ops
- tools call `item.apply(...)` directly
- selection sometimes builds ops itself rather than going through item APIs
- items trigger sibling mutations during apply

### What subscriptions are probably still necessary?

Even with a controlled durable path, many subscriptions would still be needed because they maintain derived state:

- shape/sticker/frame recompute path and MBR when transformation changes
- rich text updates DOM/canvas layout when text or transform changes
- connector recomputes line geometry and text placement when points or transforms change
- selection and spatial indexes observe item changes

References:

- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L85)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L161)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L140)
- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L209)
- [src/SpatialIndex/SpacialIndex.ts](/home/alex/microboard/hyperboard/microboard/src/SpatialIndex/SpacialIndex.ts#L116)

### What could likely be reduced?

If all durable mutations go through one path, the following could likely be reduced:

- per-class duplicated `emit()` wrappers
- some explicit `subject.publish(this)` calls that compensate for local mutation
- some command/application duplication between selection and item convenience methods

### Practical answer

If all durable mutations go through one path, publication becomes cleaner, but most geometry/layout subscriptions remain necessary. The likely gain is reduction of mutation-entry duplication, not elimination of derived-state observers.

## F. Duplication With Selection/UI Logic

Selection already constructs operations independently from item methods in several places:

- bulk border/fill ops
- bulk transform ops
- grouped text ops

References:

- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L1070)
- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L1130)
- [src/Selection/Selection.ts](/home/alex/microboard/hyperboard/microboard/src/Selection/Selection.ts#L1296)

This means privatization does **not** require every caller to go through item convenience methods. In practice, the opposite is more realistic:

- selection/UI should continue building operations
- items should own `apply(op)`
- convenience setters on items can be reduced or made internal over time

### Shared operation builders

There is still duplication in how operations are assembled:

- selection builds some ops manually
- item methods build the same op shapes separately

Introducing shared operation builders would reduce duplication and would make privatization safer, especially for:

- style changes
- transform ops
- connector endpoint ops

## G. Special Cases

### Text / Slate

Do not unify prematurely.

Current behavior:

- edit happens in Slate/editor first
- Slate ops are recorded
- `RichText.edit` is emitted afterward
- command replay uses `applyCommand(...)`

References:

- [src/Items/RichText/EditorContainer.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/EditorContainer.ts#L148)
- [src/Items/RichText/RichText.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichText.ts#L554)
- [src/Items/RichText/RichTextCommand.ts](/home/alex/microboard/hyperboard/microboard/src/Items/RichText/RichTextCommand.ts#L19)

Conclusion:

- text does not block non-text unification
- text should remain an explicitly separate mutation model for now

### Transformation local helpers

Do not remove yet.

Current behavior:

- used by preview tools
- used by nesting/local-world conversion
- used by some special items for repair/sync

References:

- [src/Items/Transformation/Transformation.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Transformation/Transformation.ts#L54)
- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L362)
- [src/Items/Comment/Comment.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Comment/Comment.ts#L297)

Conclusion:

- they should become internal/local-only APIs, not disappear immediately

### Container/group side effects

Do not force into the same abstraction too early.

Current behavior:

- child `parent` fields are rewritten
- child transforms are converted between world/local
- indexes are updated directly

References:

- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L346)
- [src/Items/BaseItem/BaseItem.ts](/home/alex/microboard/hyperboard/microboard/src/Items/BaseItem/BaseItem.ts#L383)

Conclusion:

- this is a real blocker to strict privatization
- it should be treated as an internal container-management API

### Cross-item effects

Examples:

- shape changes re-anchor connectors
- connector subscriptions reposition connector text

References:

- [src/Items/Shape/Shape.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Shape/Shape.ts#L260)
- [src/Items/Connector/Connector.ts](/home/alex/microboard/hyperboard/microboard/src/Items/Connector/Connector.ts#L1129)

Conclusion:

- these effects should remain explicit special cases during migration

## H. Target Model

### Canonical durable path

For non-text durable mutations:

1. caller builds an operation
2. `Events.applyAndEmit()` or equivalent board-level helper applies it
3. command dispatches to matching items
4. `item.apply(op)` performs the mutation
5. derived-state subscriptions recompute local geometry/layout

### What remains public

Public:

- high-level editor-facing intent APIs where useful
- operation-building APIs on selection/UI
- `Events.applyAndEmit()` or equivalent durable entry

Internal or non-public:

- preview-only local setters
- replay/deserialization helpers
- container child application helpers
- connector point application helpers
- raw field-level mutators

### How text fits

Text remains special:

- editor mutates locally
- editor emits Slate-derived `RichText` operations
- command/logging still capture durable history

### Practical restatement

The realistic target is not “everything through `BaseItem.apply()`”.

The realistic target is:

- all **durable non-text** mutations end at `item.apply(op)`
- `BaseItem.apply()` stays the shared base dispatcher
- subclasses continue to own their item-specific `apply` logic

## I. Migration Plan

### Phase 1. Classify APIs

Label current mutation APIs as:

- durable
- local-preview
- replay/deserialization
- derived-state only

Smallest useful start:

- document that `Transformation.setLocal*`, `applyStartPoint`, `applyAddChildren`, direct tool `item.apply(...)` are internal/local APIs

### Phase 2. Introduce an internal mutation boundary

Without changing behavior yet:

- keep public durable entrypoints
- rename or annotate local helpers as internal-only
- stop treating them as general external APIs

### Phase 3. Reroute external callers

Move editor-facing callers away from raw mutators where possible:

- selection stays operation-driven
- tools use preview APIs for drafts and durable ops for committed items
- avoid direct `item.apply(...)` except for preview/replay internals

### Phase 4. Centralize publication expectations

Make the rule explicit:

- durable mutations happen through command/log/event path
- local preview mutation may publish locally but must not log
- derived-state subscriptions respond consistently in both paths

### Phase 5. Reduce live-state reverse computation

Prefer operation payloads to contain reversible data, especially for:

- style ops
- base item ops
- other multi-item operations

This makes later visibility tightening safer.

### Phase 6. Privatize selectively

Only after rerouting:

- make local-only helpers non-public
- keep replay/container helpers internal
- leave text and special container APIs alone until later

## J. Recommendation

### Should we proceed now?

**Proceed with prep refactors first, not with direct privatization.**

### Smallest safe first step

The smallest safe first step is:

1. formally classify mutation APIs
2. mark preview/replay/container helpers as internal-only
3. stop adding new external callers to those helpers

Concretely, the highest-value starting set is:

- `Transformation.setLocalMatrix()`
- `Transformation.setLocal()`
- `BaseItem.applyAddChildren()`
- `BaseItem.applyRemoveChildren()`
- `Connector.applyStartPoint()`
- `Connector.applyEndPoint()`
- direct tool-time `item.apply(...)`

### Final recommendation

The architecture is close enough that unifying durable non-text mutation is feasible. But privatizing mutation methods immediately would break too many valid local-preview, replay, and cross-item flows. The practical path is to introduce a clear internal mutation boundary first, reroute callers gradually, and only then tighten visibility.

## K. Immediate Scope Override

The material below this section is future-facing and should not be read as the current implementation brief for this repository.

For the current branch, the actionable scope is narrower:

- converge item mutations, both durable and local preview, toward one item-owned `apply(...)` boundary per item family
- preserve the current durable path and current behavior
- keep the build stable and landable on the staging branch
- treat rendering-engine, plugin, and universal-framework ideas as later tracks

### Current working rule

Use this rule to evaluate changes:

- durable non-text edits should increasingly be expressed as operations whose real mutation happens in `item.apply(op)`
- preview, replay, deserialization, and structural container helpers may remain special for now, but should be explicit internal exceptions rather than general editor-facing APIs

### Important exceptions that should remain explicit for now

- `Transformation` is both durable and local-preview today, so its direct helpers should be reduced gradually rather than removed suddenly
- `RichText` remains a special case because Slate applies first and emits operations afterward
- cross-item effects such as shape-to-connector repair should be handled case by case, not forced into a premature generic abstraction
- container helpers such as `applyAddChildren()` / `applyRemoveChildren()` remain valid internal structural APIs during migration

### Practical migration order

1. Classify current mutation surfaces as durable, preview, replay/deserialization, or structural internal.
2. Pick one pilot non-text family, with `Shape` being the best first candidate.
3. Converge ordinary durable writes in that family on `apply(op)` and stop adding new setter-style mutators.
4. Move preview toward the same operation language where practical, without forcing it through history/logging.
5. Handle difficult cases like direct transformation calls, connector repair, hierarchy rewrites, and text separately after the pilot is stable.

### Definition of success for the current track

This refactor is succeeding if:

- ordinary durable non-text edits land in `item.apply(op)`
- preview increasingly reuses the same mutation language
- public mutator count shrinks instead of grows
- publish/dirty/recompute responsibilities become more centralized and predictable
- hard cases stay supported, but remain isolated as explicit exceptions

The documents below can still be useful as future background, but they go beyond the current target and should not drive immediate implementation decisions.

# Refactoring goal Below are two working documents you can use as starting drafts.

The first is for the **new standalone repository**.
The second is for the **incremental refactor of the current engine**.

They are written to be handed to agents with minimal editing. The second document reflects the feasibility findings that the current durable center already exists, while the migration problem is mainly about removing parallel mutation entrypoints rather than inventing a new mutation path.

---

# Document 1 — Design goals and scope for the new geometric rendering engine repository

## Mission

Create a standalone geometric rendering engine that accepts a deterministic, Canvas-like composition program and produces structured engine-owned output that can be rendered, queried geometrically, serialized to JSON, and safely exchanged across trust boundaries.

This repository is not the new whiteboard engine. It is a reusable subsystem that can later be imported into the core repository.

## Why this repository exists

The current engine mixes rendering, geometry derivation, item logic, and mutation concerns too tightly. We want to extract a foundation that can be developed from first principles, tested in isolation, and evolved without being constrained by the current whiteboard code structure.

This subsystem should let us define a visual object by running a composition function against a fake or isomorphic Canvas-like context. That context should not paint pixels directly. Instead, it should record drawing commands into a structured intermediate representation owned by the engine. From that representation, the engine should derive render replay, bounds, hit testing, closest-point queries, anchors, intersections, and JSON serialization.

## Core design goals

The engine must be deterministic. Given the same input composition program and the same item state, it must always produce the same structural output.

The engine must be serializable. Its output should be representable as plain validated JSON or a JSON-equivalent structural format, without executable code or host object references.

The engine must be geometry-first rather than pixel-first. Rendering to an actual canvas is only one consumer of the output. Geometry queries are equally important.

The engine must be safe to use as a plugin boundary. Untrusted or semi-trusted code should be able to describe visuals through the composition API, but the host application should only receive validated structural data, never arbitrary code.

The engine must be intentionally close to the Canvas 2D API in the subset we actually need, but it does not need full browser-canvas fidelity. Familiarity matters; compatibility for its own sake does not.

## Non-goals

This repository should not attempt to replace the whiteboard engine’s event system, command system, selection model, hierarchy model, or synchronization model.

It should not attempt to define the final item architecture of the core repository.

It should not implement the full plugin system. It only needs to make that future plugin boundary feasible.

It should not be forced to preserve old engine naming or old engine abstractions.

## Minimal public model

The repository should revolve around three concepts.

First, a **ComposeContext** or equivalent Canvas-like recording surface. Item or plugin code receives this context and calls drawing methods on it.

Second, a **recorded intermediate representation**. The composition run yields an engine-owned IR that is immutable or treated as immutable after creation.

Third, a **geometry/render object** derived from the IR. This object should expose the geometry and replay capabilities needed by the host engine.

## Required outputs of the IR or derived geometry object

At minimum, the engine should support:

render replay to a real canvas-like target

axis-aligned bounds queries

closest-point queries for shapes and paths where meaningful

point hit-testing

basic intersection checks between supported primitives or composed objects

anchor extraction or default anchor derivation

JSON serialization and deserialization

stable structural equality or a comparable deterministic representation where useful for tests

## ComposeContext requirements

The context should resemble Canvas 2D where practical, but only in the subset we choose to support. It should likely include path construction, transforms, save/restore, fill/stroke, line width, colors or paint settings, and a limited text-related or region-marking surface.

The context should record semantic drawing commands rather than raster output.

The context should be deterministic and have a controlled mutable state model.

The context should be able to produce structured geometry, not just a replay list.

The context should support future use by imported SVG-to-canvas style libraries, at least to the extent that they rely on the subset we implement.

## Geometry model expectations

The engine should not treat geometry as an afterthought derived loosely from rendering. Geometry is one of the main products.

The geometry layer should make it possible to answer questions such as:

what is the minimal bounding box

what are reasonable connector anchors

what is the closest point on the object boundary

does a point hit fill, stroke, or either

do two objects intersect

This geometry API does not need to be perfect in its first iteration, but it must be explicit and testable.

## Serialization and trust boundary

One of the strategic goals of this repository is to support safe plugin and import scenarios.

That means the engine’s structural output must be representable as validated data. No host methods or live closures should be required after composition is complete.

A future plugin runner should be able to execute untrusted composition code in isolation and pass only data back to the host.

The repository should therefore treat serializability as a first-class requirement, not a later convenience.

## Testing strategy

This repository should be heavily test-driven, but tests should focus on semantic outcomes, not accidental API shape.

The most important tests are:

composition recording tests

geometry derivation tests

bounds tests

hit-test tests

closest-point tests

render replay consistency tests

serialization roundtrip tests

determinism tests

plugin-boundary safety tests at the structural level

Tests should use compact fixture-style drawing programs as much as possible.

## Suggested development phases

Phase 1 should define the minimal ComposeContext, primitive IR, and replay-to-canvas path.

Phase 2 should add bounds and hit-testing for the supported primitive set.

Phase 3 should add anchor derivation and closest-point queries.

Phase 4 should define serialization and roundtripping.

Phase 5 should test isolated plugin-style composition flows.

Phase 6 should evaluate whether a small pilot integration into the current core repository is possible.

## Success criteria

This repository is successful when we can define a visual object by running a deterministic composition function against the fake Canvas-like context and then:

render it

query its geometry

serialize it

replay it

derive anchors

use it without host-side executable plugin code

---

# Document 2 — General refactoring guidelines for the current core repository

## Mission

Refactor the current whiteboard core incrementally toward a model where non-text item mutation is operation-driven and converges on `apply(operation)` as the public write boundary, while preserving current application behavior during the transition.

This is not a greenfield rewrite. Every step must compile and should preserve behavior or change it only in explicitly approved, localized ways.

## Why this refactor exists

The current engine already has a de facto durable mutation path, but it is surrounded by multiple parallel public mutation entrypoints. The main migration problem is therefore not inventing a new durable path, but removing and shrinking the uncontrolled mutation surface over time.

We want to converge toward a system where operations are the language of mutation, preview and durable paths use the same mutation semantics where possible, and item families stop carrying their own handwritten public setter surfaces.

## Architectural target constraints

The exact final interface may evolve, but the migration must move toward these constraints.

For non-text items, the public write surface should converge toward `apply(operation)`.

Operation construction should move out of item classes. Item classes should stop being the place where normal setter-like durable operations are authored.

Preview and durable mutation should converge on the same operation language. The difference between them should be orchestration and persistence, not a totally different mutation API.

Derived-state refresh and publication should become centered around apply, not duplicated across public setter methods.

Transformation, hierarchy, and link semantics are universal engine subsystems. Items do not opt out of them. Items only differ in how they participate.

Text remains a special mutation model for now and should not block simplification of normal item families.

No new public setter-style mutation APIs should be introduced.

No new external call sites to internal mutation helpers should be introduced.

## Non-goals of this refactor

This refactor is not trying to rewrite text immediately.

It is not trying to fully replace the transform representation decision at the same time unless a specific phase explicitly addresses that.

It is not trying to solve every connector or hierarchy side effect in one pass.

It is not trying to import the future composition engine immediately.

It is not trying to force every engine concern into one generic abstraction before migration experience exists.

## Guiding principle

The refactor should be driven by constraints, not by a speculative final class diagram.

At each phase, the repository should move closer to:

operations outside item classes

`apply(op)` as the mutation gateway

smaller public mutation surface

fewer parallel mutation entrypoints

more centralized recompute and publish behavior

## Mutation model during migration

The repository should treat three mutation modes as real and explicit.

Durable mutations are history-bearing and should go through the command/event path.

Preview mutations are local and not logged, but should increasingly use the same operation language and item apply semantics as durable mutations.

Text mutations remain editor-native and are wrapped for durable history after local editor application.

This means the migration is not about forcing all mutation modes into identical orchestration. It is about giving them a shared mutation language and a narrower write boundary where that is appropriate.

## Practical migration rules

Do not break the existing durable path while refactoring.

Do not add new public mutators just because old ones still exist.

When touching an item family, prefer introducing external operation builders over adding or extending item setters.

When touching a preview tool, prefer moving it toward applying operations on draft items rather than calling arbitrary item mutators directly.

When touching command logic, prefer reverse derived from operation payload instead of live-state rereads where feasible.

When touching item mutation internals, prefer moving recompute and publish closer to apply.

When a helper must remain internal for preview, replay, or structural reasons, mark it conceptually as internal and stop treating it as a general editor-facing API.

## Preferred migration order

Start with one pilot family that is not text and not the most structurally complex. Shapes are likely the best candidate.

For that family:

introduce external operation builders for ordinary field updates

route durable item changes through `apply(op)` rather than public setters

move preview to the same operation language where practical

centralize recomposition and publish around apply for that family

reduce or deprecate public setter APIs on that family

Only after one family works should the pattern be generalized to others such as stickers or frames.

Connector, hierarchy-heavy, or text-heavy families should come later.

## Schema usage goal

Items already have schemas in many cases, but those schemas are not yet the structural basis for mutation and item definition.

The migration should gradually increase the role of schemas by using them to support or derive operation typing and field mutation behavior.

This does not require immediate full framework automation. It is enough that the repository moves step by step toward schema-backed field operations and away from handwritten setter mutation surfaces.

## Relationship to the future composition engine

The current repository should not wait for the new composition engine before beginning the mutation-surface refactor.

The composition engine is a separate exploratory track. The core repository should continue refactoring toward the new constraints now, even while rendering/composition experiments happen elsewhere.

When the new composition engine becomes usable, it can be introduced into a codebase that already has a cleaner operation and item model.

That sequencing reduces risk.

## Deliverables expected from the refactor track

A short target-constraints note kept in the repository.

A phase-by-phase migration plan for at least one pilot item family.

A rule that no new public setter-style mutation APIs may be introduced.

A rule that preview work should increasingly use operations applied to draft items.

A rule that internal helpers for replay, preview, or hierarchy remain allowed but are not editor-facing public write APIs.

## Definition of success

This refactor is successful when the repository can migrate item families one by one toward a model where:

normal durable edits are authored as operations outside the item class

the item’s public write boundary converges toward `apply(op)`

preview increasingly uses the same operation language

public setters shrink rather than grow

recompute and publish logic move closer to apply

the codebase becomes easier to evolve toward the future schema-and-composition model
