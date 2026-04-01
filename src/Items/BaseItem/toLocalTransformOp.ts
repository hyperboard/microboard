import { TransformationOperation, Matrix } from "browser";
import { ApplyMatrixOperation, TransformMany } from "Items/Transformation/TransformationOperations";

/**
 * Converts a world-space Transformation operation into an equivalent local-space
 * operation relative to `containerMatrix`. Used when replaying ops (including old
 * log events) against items that now store local transforms.
 *
 * Scale ratios in `applyMatrix` are coordinate-space invariant — only translation
 * deltas need to be rotated/scaled by the inverse of the container's linear transform.
 */
export function toLocalTransformOp(
    op: TransformationOperation,
    containerMatrix: Matrix,
    itemId?: string): TransformationOperation {
    switch (op.method) {
        case 'applyMatrix': {
            const converted = op.items.map(item => {
                const local = containerMatrix.applyInverseLinear(item.matrix.translateX, item.matrix.translateY);
                return { ...item, matrix: { ...item.matrix, translateX: local.x, translateY: local.y } };
            });
            return { ...op, items: converted } as ApplyMatrixOperation;
        }
        case 'transformMany': {
            if (!itemId || !op.items[itemId]) return op;
            const subOp = op.items[itemId] as TransformationOperation;
            const localSubOp = toLocalTransformOp(subOp, containerMatrix);
            return { ...op, items: { ...op.items, [itemId]: localSubOp } } as TransformMany;
        }
        case 'translateBy':
        case 'translateTo': {
            const local = containerMatrix.applyInverseLinear(op.x, op.y);
            return { ...op, x: local.x, y: local.y };
        }
        case 'scaleByTranslateBy': {
            const local = containerMatrix.applyInverseLinear(op.translate.x, op.translate.y);
            return { ...op, translate: { x: local.x, y: local.y } };
        }
        default:
            // rotateTo, rotateBy, locked, unlocked, deserialize — no translation
            return op;
    }
}
