import { initNodeSettings } from "./src/api/initNodeSettings";

async function testCanvasGroup() {
    initNodeSettings();
    
    // Dynamic import to ensure initNodeSettings has run before these modules are evaluated
    const { Board } = await import("./src/Board");

    const board = new Board();

    // 1. Create two shapes at world positions
    const s1 = board.add(board.createItem("s1", {
        itemType: "Shape",
        shapeType: "Rectangle",
        transformation: { translateX: 100, translateY: 100, scaleX: 1, scaleY: 1, rotate: 0 },
        mbr: { left: 100, top: 100, right: 200, bottom: 200 }
    } as any));

    const s2 = board.add(board.createItem("s2", {
        itemType: "Shape",
        shapeType: "Rectangle",
        transformation: { translateX: 300, translateY: 300, scaleX: 1, scaleY: 1, rotate: 0 },
        mbr: { left: 300, top: 300, right: 400, bottom: 400 }
    } as any));

    console.log("Initial S1 World Pos:", s1.getWorldMatrix().translateX, s1.getWorldMatrix().translateY);

    // 2. Group them 
    const group = board.group([s1, s2]);
    
    console.log("Post-Group S1 Parent:", s1.parent);
    console.log("Post-Group S1 Local Pos:", s1.transformation.getMatrixData().translateX, s1.transformation.getMatrixData().translateY);
    
    // 3. Move group by (50, 50)
    group.transformation.translateBy(50, 50);
    
    console.log("Moved Group World Pos:", group.getWorldMatrix().translateX, group.getWorldMatrix().translateY);
    console.log("Moved S1 Local Pos:", s1.transformation.getMatrixData().translateX, s1.transformation.getMatrixData().translateY);
    console.log("Moved S1 World Pos:", s1.getWorldMatrix().translateX, s1.getWorldMatrix().translateY);

    // 4. Check if Shape's path coordinates are LOCAL 
    const s1Path = (s1 as any).path;
    console.log("S1 Path Mbr (should be local):", s1Path.getMbr().left, s1Path.getMbr().top);

    const s1World = s1.getWorldMatrix().translateX;
    const s1PathLeft = s1Path.getMbr().left;
    
    if (s1World === 150 && Math.abs(s1PathLeft - 100) < 1) {
        console.log("SUCCESS: Canvas Coordinate Math is Correct!");
    } else {
        console.log("FAILURE: Coordinate mismatch! S1 World:", s1World, "S1 Path Left:", s1PathLeft);
    }
}

testCanvasGroup().catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
