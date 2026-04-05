import { expect, describe, test } from "bun:test";
import { initNodeSettings } from "../../api/initNodeSettings";
initNodeSettings();

import { BaseItem } from "./BaseItem";
import { Matrix } from "../../Geometry/Transformation/Matrix";
import { Mbr } from "../../Geometry/Mbr/Mbr";
import { SimpleSpatialIndex } from "../../SpatialIndex/SimpleSpatialIndex";
import { Board } from "../../Board";

class MockItem extends BaseItem {
    itemType = "MockItem" as any;
    constructor(board: Board, id: string) {
        super(board, id);
    }
    setMbrBounds(left: number, top: number, right: number, bottom: number) {
        (this as any).mbr = new Mbr(left, top, right, bottom);
    }
}

class MockContainer extends BaseItem {
    itemType = "MockContainer" as any;
    constructor(board: Board, id: string) {
        super(board, id);
        // SimpleSpatialIndex needs Camera and Pointer
        this.index = new SimpleSpatialIndex({} as any, {} as any);
    }
    getMbr(): Mbr {
        const children = this.index!.listAll();
        if (children.length === 0) return (this as any).mbr;

        const worldUnion = Mbr.unionOf(children.map(c => (c as any).getWorldMbr()));
        const parentMatrix = this.getParentWorldMatrix();
        const parentSpaceMbr = worldUnion.getTransformed(parentMatrix.getInverse());
        return parentSpaceMbr;
    }
}

describe("Geometry Architecture (BaseItem Isolation)", () => {
    const createMockBoard = (idMap: Record<string, any>) => ({
        items: {
            getById: (id: string) => idMap[id] || null
        },
        events: { emit: () => {} },
        camera: { getScale: () => 1 }
    } as any);

    describe("BaseItem on-the-fly world matrix/MBR", () => {
        test("child world-space projections reflect parent move without cache invalidation", () => {
            const idMap: Record<string, any> = {};
            const mockBoard = createMockBoard(idMap);

            const child = new MockItem(mockBoard, "child-1");
            child.setMbrBounds(0, 0, 100, 100);

            const container = new MockContainer(mockBoard, "container-1");
            idMap[container.id] = container;

            child.parent = container.id;

            container.applyMove({
                id: container.id,
                worldMatrix: new Matrix(100, 100, 1, 1).getMatrixData(),
            });

            const worldMatrix = child.getWorldMatrix();
            expect(worldMatrix.translateX).toBe(100);
            expect(worldMatrix.translateY).toBe(100);

            const worldMbr = child.getWorldMbr();
            expect(worldMbr.left).toBe(100);
            expect(worldMbr.top).toBe(100);
        });

        test("deeply nested child reflects multi-level parent transformation", () => {
            const idMap: Record<string, any> = {};
            const mockBoard = createMockBoard(idMap);

            const grandchild = new MockItem(mockBoard, "grandchild-1");
            grandchild.setMbrBounds(0, 0, 50, 50);

            const parentContainer = new MockContainer(mockBoard, "parent-1");
            idMap[parentContainer.id] = parentContainer;

            const grandparentContainer = new MockContainer(mockBoard, "grandparent-1");
            idMap[grandparentContainer.id] = grandparentContainer;

            grandchild.parent = parentContainer.id;
            parentContainer.parent = grandparentContainer.id;

            grandparentContainer.applyMove({
                id: grandparentContainer.id,
                worldMatrix: new Matrix(100, 100, 1, 1).getMatrixData(),
            });

            parentContainer.applyMove({
                id: parentContainer.id,
                worldMatrix: new Matrix(150, 150, 1, 1).getMatrixData(),
            });

            const worldMbr = grandchild.getWorldMbr();
            expect(worldMbr.left).toBe(150);
            expect(worldMbr.top).toBe(150);
        });
    });

    describe("MockContainer parent-local contract", () => {
        test("Container getMbr() returns bounds in parent's coordinate space", () => {
            const idMap: Record<string, any> = {};
            const mockBoard = createMockBoard(idMap);

            const child = new MockItem(mockBoard, "child-1");
            child.setMbrBounds(20, 20, 40, 40);

            const container = new MockContainer(mockBoard, "container-1");
            idMap[container.id] = container;
            container.index?.insert(child as any);
            child.parent = container.id;

            container.applyMove({
                id: container.id,
                worldMatrix: new Matrix(100, 100, 1, 1).getMatrixData(),
            });

            const containerMbr = container.getMbr();
            expect(containerMbr.left).toBe(120);
            expect(containerMbr.top).toBe(120);
            expect(containerMbr.getWidth()).toBe(20);
        });
    });

    describe("Mbr.unionOf utility", () => {
        test("correctly calculates union of multiple MBRs", () => {
            const m1 = new Mbr(0, 0, 100, 100);
            const m2 = new Mbr(50, 50, 150, 150);
            const m3 = new Mbr(-10, -10, 10, 10);

            const union = Mbr.unionOf([m1, m2, m3]);
            expect(union.left).toBe(-10);
            expect(union.top).toBe(-10);
            expect(union.right).toBe(150);
            expect(union.bottom).toBe(150);
        });
    });
});
