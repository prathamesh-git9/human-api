import { describe, it, expect } from 'vitest';
import { mmr, mmrWithConfig } from './mmr';
describe('MMR re-ranker', () => {
    const mockItems = [
        {
            id: 'item1',
            vec: [1, 0, 0],
            baseScore: 0.9,
        },
        {
            id: 'item2',
            vec: [0, 1, 0],
            baseScore: 0.8,
        },
        {
            id: 'item3',
            vec: [0, 0, 1],
            baseScore: 0.7,
        },
        {
            id: 'item4',
            vec: [0.9, 0.1, 0],
            baseScore: 0.6,
        },
    ];
    const queryVec = [1, 0, 0];
    describe('basic functionality', () => {
        it('returns empty array for empty items', () => {
            const result = mmr([], queryVec, 0.5, 3);
            expect(result).toEqual([]);
        });
        it('returns empty array for k=0', () => {
            const result = mmr(mockItems, queryVec, 0.5, 0);
            expect(result).toEqual([]);
        });
        it('returns all items when k >= items.length', () => {
            const result = mmr(mockItems, queryVec, 0.5, 10);
            expect(result).toHaveLength(4);
            expect(result[0]).toBe('item1'); // highest base score
        });
    });
    describe('lambda extremes', () => {
        it('lambda=1 behaves like relevance-only', () => {
            const result = mmr(mockItems, queryVec, 1.0, 2);
            expect(result).toContain('item1'); // most relevant to query
            expect(result).toContain('item4'); // second most relevant
        });
        it('lambda=0 favors diversity', () => {
            const result = mmr(mockItems, queryVec, 0.0, 3);
            expect(result).toHaveLength(3);
            // Should select diverse items even if less relevant
            expect(result).toContain('item1');
            expect(result).toContain('item2');
            expect(result).toContain('item3');
        });
    });
    describe('diversity with near-duplicates', () => {
        const duplicateItems = [
            {
                id: 'dup1',
                vec: [1, 0, 0],
                baseScore: 0.9,
            },
            {
                id: 'dup2',
                vec: [0.99, 0.01, 0],
                baseScore: 0.8,
            },
            {
                id: 'different',
                vec: [0, 1, 0],
                baseScore: 0.7,
            },
        ];
        it('avoids near-duplicates when lambda < 1', () => {
            const result = mmr(duplicateItems, queryVec, 0.3, 2); // Lower lambda for more diversity
            expect(result).toHaveLength(2);
            expect(result).toContain('dup1'); // most relevant
            expect(result).toContain('different'); // diverse, not dup2
        });
    });
    describe('edge cases', () => {
        it('handles single item', () => {
            const singleItem = [mockItems[0]];
            const result = mmr(singleItem, queryVec, 0.5, 1);
            expect(result).toEqual(['item1']);
        });
        it('handles k > items.length gracefully', () => {
            const result = mmr(mockItems, queryVec, 0.5, 10);
            expect(result).toHaveLength(4);
        });
        it('handles zero vectors', () => {
            const zeroItems = [
                { id: 'zero1', vec: [0, 0, 0], baseScore: 0.5 },
                { id: 'zero2', vec: [0, 0, 0], baseScore: 0.4 },
            ];
            const result = mmr(zeroItems, queryVec, 0.5, 2);
            expect(result).toHaveLength(2);
        });
    });
    describe('mmrWithConfig', () => {
        it('works with config object', () => {
            const config = { lambda: 0.7, k: 2 };
            const result = mmrWithConfig(mockItems, queryVec, config);
            expect(result).toHaveLength(2);
        });
    });
    describe('cosine similarity edge cases', () => {
        it('handles identical vectors', () => {
            const identicalItems = [
                { id: 'a', vec: [1, 2, 3], baseScore: 0.8 },
                { id: 'b', vec: [1, 2, 3], baseScore: 0.7 },
            ];
            const result = mmr(identicalItems, [1, 2, 3], 0.5, 2);
            expect(result).toHaveLength(2);
        });
        it('handles orthogonal vectors', () => {
            const orthogonalItems = [
                { id: 'x', vec: [1, 0, 0], baseScore: 0.8 },
                { id: 'y', vec: [0, 1, 0], baseScore: 0.7 },
                { id: 'z', vec: [0, 0, 1], baseScore: 0.6 },
            ];
            const result = mmr(orthogonalItems, [1, 0, 0], 0.5, 3);
            expect(result).toHaveLength(3);
        });
    });
});
