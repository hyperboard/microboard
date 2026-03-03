# Transformation Migration Plan: Multiple Operation Types → Single `applyMatrix`

## Goal

Replace all geometric transformation event types (`translateBy`, `translateTo`, `scaleBy`, `scaleTo`, `scaleByTranslateBy`, `scaleByRelativeTo`, `scaleToRelativeTo`) with a single `applyMatrix` operation that applies a delta matrix to the current transformation state.

**Not in scope:** rotation (`rotateTo`, `rotateBy`), `locked`/`unlocked`, `deserialize`, `transformMany` wrapper.

---

## Current State

### Operation types (TransformationOperations.ts)

| Type | Method | Parameters |
|------|--------|-----------|
| TranslateOperation | `translateTo` / `translateBy` | `x, y` |
| ScaleOperation | `scaleTo` / `scaleBy` | `x, y` |
| ScaleRelativeToOperation | `scaleToRelativeTo` / `scaleByRelativeTo` | `x, y, point` |
| ScaleByTranslateByOperation | `scaleByTranslateBy` | `scale: {x,y}, translate: {x,y}` |

### Files that check `op.method` (require refactoring)

| File | What it does |
|------|-------------|
| `src/Items/Transformation/Transformation.ts:107` | `apply()` — main switch on 9 methods |
| `src/Items/Transformation/TransformationCommand.ts:39` | `getReverse()` — ~200 lines switch for undo/redo |
| `src/Events/Merge.ts:106` | merge consecutive operations — switch per type |
| `src/Items/Connector/Connector.ts:136` | subscription checks `scaleByTranslateBy` to decide whether to call `scalePoints()` |
| `src/Selection/Transformer/TransformerHelpers/handleMultipleItemsResize.ts` | builds per-item `scaleByTranslateBy` operations |

### Files that call dispatch methods (NOT changing — public API stays)

`Select.ts`, `transformRichText.ts`, `transformAINode.ts`, `Sticker.ts`, `Shape.ts`, `Frame.ts`,
`Placeholder.ts`, `Image.ts`, `AddDrawing.ts`, `ExportSnapshot.ts`, `CardGame/Deck.ts`, `handleAiChatMessage.ts`

---

## Target State

### Single new operation type

```typescript
interface ApplyMatrixOperation extends TransformationBase {
    method: "applyMatrix";
    matrix: {
        translateX: number;
        translateY: number;
        scaleX: number;
        scaleY: number;
        shearX: number;
        shearY: number;
    };
}
```

### Benefits

| Area | Before | After |
|------|--------|-------|
| `TransformationOperations.ts` | 5 geometric types + union | 1 type |
| `Transformation.apply()` | switch on 9 cases | 1 case |
| `TransformationCommand.getReverse()` | ~200 lines per-type logic | `matrix.invert()` |
| `Merge.ts` | switch per type | `matrixA.multiplyByMatrix(matrixB)` |
| `transformMany` items dict | mixed types per item | always `applyMatrix` |

---

## Migration Phases

### Phase 1 — New operation type

**File:** `src/Items/Transformation/TransformationOperations.ts`

- Add `ApplyMatrixOperation` interface
- Add it to the `TransformationOperation` union type
- Keep old types temporarily (remove in Phase 7)

---

### Phase 2 — Dispatch methods emit `applyMatrix`

**File:** `src/Items/Transformation/Transformation.ts` (lines 260–376)

Dispatch methods remain in the public API but internally compute a delta matrix:

```typescript
translateBy(x, y, timeStamp?) {
    // delta matrix: only translation
    this.emit({ method: "applyMatrix", matrix: { translateX: x, translateY: y, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 }, timeStamp });
}

translateTo(x, y, timeStamp?) {
    // compute delta from current state
    const dx = x - this.matrix.translateX;
    const dy = y - this.matrix.translateY;
    this.emit({ method: "applyMatrix", matrix: { translateX: dx, translateY: dy, scaleX: 1, scaleY: 1, shearX: 0, shearY: 0 }, timeStamp });
}

scaleBy(x, y, timeStamp?) {
    // delta matrix: only scale
    this.emit({ method: "applyMatrix", matrix: { translateX: 0, translateY: 0, scaleX: x, scaleY: y, shearX: 0, shearY: 0 }, timeStamp });
}

scaleTo(x, y, timeStamp?) {
    // compute delta from current scale
    const sx = x / this.matrix.scaleX;
    const sy = y / this.matrix.scaleY;
    this.emit({ method: "applyMatrix", matrix: { translateX: 0, translateY: 0, scaleX: sx, scaleY: sy, shearX: 0, shearY: 0 }, timeStamp });
}

scaleByTranslateBy(scale, translate, timeStamp?) {
    // combined delta matrix
    this.emit({ method: "applyMatrix", matrix: { translateX: translate.x, translateY: translate.y, scaleX: scale.x, scaleY: scale.y, shearX: 0, shearY: 0 }, timeStamp });
}

scaleByRelativeTo(x, y, point, timeStamp?) {
    // compute resulting delta matrix
    const tx = point.x - point.x * x;
    const ty = point.y - point.y * y;
    this.emit({ method: "applyMatrix", matrix: { translateX: tx, translateY: ty, scaleX: x, scaleY: y, shearX: 0, shearY: 0 }, timeStamp });
}

scaleToRelativeTo(x, y, point, timeStamp?) {
    const sx = x / this.matrix.scaleX;
    const sy = y / this.matrix.scaleY;
    const tx = point.x - point.x * sx;
    const ty = point.y - point.y * sy;
    this.emit({ method: "applyMatrix", matrix: { translateX: tx, translateY: ty, scaleX: sx, scaleY: sy, shearX: 0, shearY: 0 }, timeStamp });
}
```

---

### Phase 3 — `apply()` simplified to one case

**File:** `src/Items/Transformation/Transformation.ts` (lines 107–150)

```typescript
apply(op: Operation): void {
    this.previous = this.matrix.copy();
    switch (op.method) {
        case "applyMatrix":
            this.matrix.multiplyByMatrix(
                new Matrix(op.matrix.translateX, op.matrix.translateY, op.matrix.scaleX, op.matrix.scaleY, op.matrix.shearX, op.matrix.shearY)
            );
            break;
        case "transformMany":
            this.applyTransformMany(op.items[this.id]);
            break;
        case "rotateTo":
            this.applyRotateTo(op.degree);
            break;
        case "rotateBy":
            this.applyRotateBy(op.degree);
            break;
        case "locked":
            this.applyLocked(op.locked);
            break;
        case "unlocked":
            this.applyUnlocked(op.locked);
            break;
        default:
            return;
    }
    this.subject.publish(this, op);
}
```

Delete private methods: `applyTranslateTo`, `applyTranslateBy`, `applyScaleTo`, `applyScaleBy`, `applyScaleByTranslateBy`, `applyScaleByRelativeTo`, `applyScaleToRelativeTo`.

---

### Phase 4 — TransformationCommand: undo via `matrix.invert()`

**File:** `src/Items/Transformation/TransformationCommand.ts`

Replace ~200 lines of `getReverse()` switch:

```typescript
getReverse(): TransformationOperation[] {
    const { operation, transformation } = this;

    if (operation.method === "applyMatrix") {
        const m = new Matrix(
            operation.matrix.translateX, operation.matrix.translateY,
            operation.matrix.scaleX, operation.matrix.scaleY,
            operation.matrix.shearX, operation.matrix.shearY
        );
        const inv = m.getInverse(); // already exists in Matrix.ts
        return transformation.map(t => ({
            class: "Transformation",
            method: "applyMatrix",
            item: [t.getId()],
            matrix: { translateX: inv.translateX, translateY: inv.translateY, scaleX: inv.scaleX, scaleY: inv.scaleY, shearX: inv.shearX, shearY: inv.shearY },
        }));
    }

    if (operation.method === "transformMany") {
        // each item gets the inverse of its own delta matrix
        return transformation.map(t => {
            const op = operation.items[t.getId()] as ApplyMatrixOperation;
            const m = new Matrix(op.matrix.translateX, op.matrix.translateY, op.matrix.scaleX, op.matrix.scaleY, op.matrix.shearX, op.matrix.shearY);
            const inv = m.getInverse();
            return {
                class: "Transformation",
                method: "applyMatrix",
                item: [t.getId()],
                matrix: { translateX: inv.translateX, translateY: inv.translateY, scaleX: inv.scaleX, scaleY: inv.scaleY, shearX: inv.shearX, shearY: inv.shearY },
            };
        });
    }

    // rotateTo, rotateBy, locked, unlocked — unchanged
}
```

---

### Phase 5 — Merge.ts: merge via matrix multiplication

**File:** `src/Events/Merge.ts`

Replace per-type switch with matrix multiplication:

```typescript
function mergeTransformationOperations(opA, opB) {
    if (opA.method !== opB.method) return undefined;

    if (opA.method === "applyMatrix" && opB.method === "applyMatrix") {
        const mA = new Matrix(opA.matrix.translateX, opA.matrix.translateY, opA.matrix.scaleX, opA.matrix.scaleY, opA.matrix.shearX, opA.matrix.shearY);
        const mB = new Matrix(opB.matrix.translateX, opB.matrix.translateY, opB.matrix.scaleX, opB.matrix.scaleY, opB.matrix.shearX, opB.matrix.shearY);
        const merged = mA.multiplyByMatrix(mB);
        return {
            ...opB,
            matrix: { translateX: merged.translateX, translateY: merged.translateY, scaleX: merged.scaleX, scaleY: merged.scaleY, shearX: merged.shearX, shearY: merged.shearY },
        };
    }

    if (opA.method === "transformMany" && opB.method === "transformMany") {
        // merge per-item matrices via multiplication — same logic above per item
    }

    if (opA.method === "rotateBy" && opB.method === "rotateBy") {
        return { ...opB, degree: opA.degree + opB.degree };
    }

    return undefined;
}
```

---

### Phase 6 — handleMultipleItemsResize: build `applyMatrix` per item

**File:** `src/Selection/Transformer/TransformerHelpers/handleMultipleItemsResize.ts`

Each item currently receives `{ method: "scaleByTranslateBy", scale, translate }`.
Change to emit `applyMatrix`:

```typescript
// Before
items[id] = { class: "Transformation", method: "scaleByTranslateBy", item: [id], scale, translate };

// After
items[id] = { class: "Transformation", method: "applyMatrix", item: [id], matrix: { translateX: translate.x, translateY: translate.y, scaleX: scale.x, scaleY: scale.y, shearX: 0, shearY: 0 } };
```

Same change in `getRichTextTranslation`, `getAINodeTranslation`, `getItemTranslation` helpers in the same file.

---

### Phase 7 — Connector.ts: update subscription

**File:** `src/Items/Connector/Connector.ts` (lines 136–149)

```typescript
// Before
if (operation.method === 'scaleByTranslateBy' && (operation.scale.x !== 1 || operation.scale.y !== 1)) {
    this.scalePoints();
}

// After
if (operation.method === 'applyMatrix' && (operation.matrix.scaleX !== 1 || operation.matrix.scaleY !== 1)) {
    this.scalePoints();
}
```

---

### Phase 8 — Cleanup

- Remove old operation types from `TransformationOperations.ts`: `TranslateOperation`, `ScaleOperation`, `ScaleRelativeToOperation`, `ScaleByTranslateByOperation`
- Remove private `applyXxx` methods from `Transformation.ts`
- Remove old cases from `TransformationCommand.ts` and `Merge.ts`
- Update TypeScript union type in `TransformationOperations.ts`

---

## What Does NOT Change

| Component | Why |
|-----------|-----|
| `Transformer.ts` | Orchestrates via helpers, no direct operation type knowledge |
| All dispatch callers (`Select.ts`, `transformRichText.ts`, etc.) | Call public API methods which remain |
| `Matrix.ts` | Already has `invert()`, `getInverse()`, `multiplyByMatrix()` — ready |
| Rotation (`rotateTo`, `rotateBy`) | Out of scope |
| `locked` / `unlocked` | Not geometric transforms |
| `deserialize` | Separate concern |
| Serialization format (`TransformationData`) | Stores final state, not operations |

---

## Execution Order

```
Phase 1 (new type)
    → Phase 2 (dispatch methods)
    → Phase 3 (apply)
    → Phase 4 (command / undo)
    → Phase 5 (merge)
    → Phase 6 (resize helpers)
    → Phase 7 (connector)
    → Phase 8 (cleanup)
```

Each phase compiles and passes tests independently before moving to the next.
