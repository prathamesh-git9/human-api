import { describe, it, expect } from 'vitest';
import { chunkText } from '../chunk/chunker.js';
describe('Chunker Performance Tests', () => {
    it('should handle large text efficiently', () => {
        const largeText = 'This is a test sentence. '.repeat(1000);
        const startTime = performance.now();
        const chunks = chunkText(largeText, 100, 20);
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        expect(chunks).toBeDefined();
        expect(chunks.length).toBeGreaterThan(0);
        expect(executionTime).toBeLessThan(1000); // Should complete in under 1 second
    });
    it('should maintain consistent performance across multiple runs', () => {
        const text = 'This is a test sentence. '.repeat(100);
        const times = [];
        // Run 10 iterations
        for (let i = 0; i < 10; i++) {
            const startTime = performance.now();
            chunkText(text, 50, 10);
            const endTime = performance.now();
            times.push(endTime - startTime);
        }
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        // Performance should be consistent (max shouldn't be more than 5x min)
        expect(maxTime / minTime).toBeLessThan(5);
        expect(avgTime).toBeLessThan(100); // Average should be under 100ms
    });
    it('should handle edge cases efficiently', () => {
        const edgeCases = [
            '', // Empty string
            'a', // Single character
            'a'.repeat(10000), // Very long single character
            'word '.repeat(1000), // Many words
            '\n'.repeat(1000), // Many newlines
        ];
        for (const text of edgeCases) {
            const startTime = performance.now();
            const chunks = chunkText(text, 100, 20);
            const endTime = performance.now();
            expect(chunks).toBeDefined();
            expect(endTime - startTime).toBeLessThan(500); // Should handle edge cases quickly
        }
    });
});
