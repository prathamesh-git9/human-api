/**
 * Maximal Marginal Relevance (MMR) re-ranker
 * Balances relevance and diversity in search results
 */

export interface MMRItem {
    id: string;
    vec: number[];
    baseScore: number;
}

export interface MMRConfig {
    lambda: number; // 0 = diversity only, 1 = relevance only
    k: number; // max results to return
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate relevance score between query vector and item vector
 */
function calculateRelevance(queryVec: number[], itemVec: number[]): number {
    return cosineSimilarity(queryVec, itemVec);
}

/**
 * Calculate diversity score (max similarity to already selected items)
 */
function calculateDiversity(
    candidateId: string,
    selectedItems: MMRItem[],
    allItems: MMRItem[]
): number {
    if (selectedItems.length === 0) return 0;

    const candidate = allItems.find(item => item.id === candidateId);
    if (!candidate) return 0;

    let maxSimilarity = 0;
    for (const selected of selectedItems) {
        const similarity = cosineSimilarity(candidate.vec, selected.vec);
        maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
}

/**
 * MMR re-ranking algorithm
 * 
 * @param items - Array of items with vectors and base scores
 * @param queryVec - Query vector for relevance calculation
 * @param lambda - Balance between relevance (1) and diversity (0)
 * @param k - Maximum number of items to return
 * @returns Ordered array of item IDs
 */
export function mmr(
    items: MMRItem[],
    queryVec: number[],
    lambda: number = 0.5,
    k: number = 12
): string[] {
    if (items.length === 0) return [];
    if (k <= 0) return [];

    // If k >= items.length, return all items ordered by base score
    if (k >= items.length) {
        return items
            .sort((a, b) => b.baseScore - a.baseScore)
            .map(item => item.id);
    }

    const selected: MMRItem[] = [];
    const remaining = new Set(items.map(item => item.id));

    // MMR selection loop
    while (selected.length < k && remaining.size > 0) {
        let bestId = '';
        let bestScore = -Infinity;

        for (const id of remaining) {
            const item = items.find(i => i.id === id);
            if (!item) continue;

            const relevance = calculateRelevance(queryVec, item.vec);
            const diversity = calculateDiversity(id, selected, items);

            // MMR score: lambda * relevance - (1 - lambda) * diversity
            const mmrScore = lambda * relevance - (1 - lambda) * diversity;

            if (mmrScore > bestScore) {
                bestScore = mmrScore;
                bestId = id;
            }
        }

        if (bestId && bestScore > -Infinity) {
            const item = items.find(i => i.id === bestId);
            if (item) {
                selected.push(item);
                remaining.delete(bestId);
            }
        } else {
            // No more items can improve the score
            break;
        }
    }

    return selected.map(item => item.id);
}

/**
 * MMR with configuration object
 */
export function mmrWithConfig(
    items: MMRItem[],
    queryVec: number[],
    config: MMRConfig
): string[] {
    return mmr(items, queryVec, config.lambda, config.k);
}

