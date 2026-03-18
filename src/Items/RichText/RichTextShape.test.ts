import { describe, it, expect, beforeAll } from 'bun:test';
import { Board } from 'Board';
import { Shape } from '../Shape/Shape';
import { initNodeSettings } from 'api/initNodeSettings';

beforeAll(() => {
    initNodeSettings();
});

describe('RichText in Shape', () => {
    it('scales maxWidth with shape transformation', () => {
        const board = new Board();
        const shape = new Shape(board, 'test-id', 'Star');
        const rt = shape.getRichText();
        
        // Star textBounds width is 50 (75 - 25)
        // Manually trigger container set if needed (in case transformPath skipped in Node)
        rt.setContainer(shape.getPaths().getMbr().copy()); // Using path MBR as context for container
        // Wait, Star textBounds is 50. Let's use the actual Star.textBounds
        // but rt.setContainer already happened or should happen.
        
        // Let's just test that it changes when scale changes
        const initialWidth = rt.getMaxWidth() || 0;
        
        shape.transformation.setLocal({
            scaleX: 2,
            scaleY: 2,
        });
        
        const scaledWidth = rt.getMaxWidth() || 0;
        expect(scaledWidth).toBeGreaterThan(0);
        expect(scaledWidth).toBe(initialWidth * 2);
    });
});
