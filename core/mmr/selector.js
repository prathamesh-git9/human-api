import { z } from 'zod';
const MMRConfigSchema = z.object({
    lambda: z.number().min(0).max(1).default(0.7),
    maxResults: z.number().int().min(1).max(100).default(10),
    diversityThreshold: z.number().min(0).max(1).default(0.3),
});
export class MMRSelector {
    config;
    constructor(config = {}) {
        this.config = MMRConfigSchema.parse({
            lambda: 0.7,
            maxResults: 10,
            diversityThreshold: 0.3,
            ...config,
        });
    }
    select(queryEmbedding, candidates, embeddings) {
        if (candidates.length === 0) {
            return { selected: [], scores: new Map() };
        }
        const scores = new Map();
        const selected = [];
        const remaining = new Set(candidates.map(c => c.id));
        // Calculate initial relevance scores
        for (const candidate of candidates) {
            const embedding = embeddings.get(candidate.id);
            if (!embedding)
                continue;
            const relevance = this.calculateRelevance(queryEmbedding, embedding);
            scores.set(candidate.id, relevance);
        }
        // MMR selection
        while (selected.length < this.config.maxResults && remaining.size > 0) {
            let bestId = '';
            let bestScore = -Infinity;
            for (const id of remaining) {
                const relevance = scores.get(id) || 0;
                const diversity = this.calculateDiversity(id, selected, embeddings);
                const mmrScore = this.config.lambda * relevance - (1 - this.config.lambda) * diversity;
                if (mmrScore > bestScore) {
                    bestScore = mmrScore;
                    bestId = id;
                }
            }
            if (bestId && bestScore > -Infinity) {
                const candidate = candidates.find(c => c.id === bestId);
                if (candidate) {
                    selected.push(candidate);
                    remaining.delete(bestId);
                }
            }
            else {
                break;
            }
        }
        return { selected, scores };
    }
    calculateRelevance(query, candidate) {
        return this.cosineSimilarity(query, candidate);
    }
    calculateDiversity(candidateId, selected, embeddings) {
        if (selected.length === 0)
            return 0;
        const candidateEmbedding = embeddings.get(candidateId);
        if (!candidateEmbedding)
            return 0;
        let maxSimilarity = 0;
        for (const item of selected) {
            const itemEmbedding = embeddings.get(item.id);
            if (!itemEmbedding)
                continue;
            const similarity = this.cosineSimilarity(candidateEmbedding, itemEmbedding);
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        return maxSimilarity;
    }
    cosineSimilarity(a, b) {
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
    // Time-based reranking
    rerankByTime(items, timeWeight = 0.3) {
        return items
            .map(item => ({
            ...item,
            timeScore: this.calculateTimeScore(item, timeWeight),
        }))
            .sort((a, b) => b.timeScore - a.timeScore)
            .map(({ timeScore, ...item }) => item);
    }
    calculateTimeScore(item, weight) {
        const now = Date.now();
        const itemTime = item.metadata.occurredAt || now;
        const ageHours = (now - itemTime) / (1000 * 60 * 60);
        // Exponential decay: newer items get higher scores
        const timeScore = Math.exp(-ageHours / 24); // 24-hour half-life
        return item.score * (1 - weight) + timeScore * weight;
    }
}
