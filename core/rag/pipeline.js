import { z } from 'zod';
import { EmbeddingGenerator } from '../embed/generator';
import { MMRSelector } from '../mmr/selector';
const RAGConfigSchema = z.object({
    topK: z.number().int().min(1).max(50).default(10),
    mmrLambda: z.number().min(0).max(1).default(0.7),
    minScore: z.number().min(0).max(1).default(0.3),
    maxCitations: z.number().int().min(1).max(20).default(5),
});
export class RAGPipeline {
    embeddingGenerator;
    mmrSelector;
    config;
    constructor(config = {}) {
        this.config = RAGConfigSchema.parse({
            topK: 10,
            mmrLambda: 0.7,
            minScore: 0.3,
            maxCitations: 5,
            ...config,
        });
        this.embeddingGenerator = new EmbeddingGenerator();
        this.mmrSelector = new MMRSelector({
            lambda: this.config.mmrLambda,
            maxResults: this.config.topK,
        });
    }
    async initialize() {
        await this.embeddingGenerator.initialize();
    }
    async query(query, candidates) {
        // Generate query embedding
        const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query.question);
        // Filter candidates
        const filteredCandidates = this.filterCandidates(candidates, query.filters);
        // Convert to MMR format
        const mmrCandidates = filteredCandidates.map(c => ({
            id: c.id,
            score: 0, // Will be calculated by MMR
            text: c.text,
            metadata: c.metadata,
        }));
        // Create embeddings map
        const embeddings = new Map(filteredCandidates.map(c => [c.id, c.embedding]));
        // MMR selection
        const { selected } = this.mmrSelector.select(queryEmbedding, mmrCandidates, embeddings);
        // Generate answer with citations
        const result = await this.generateAnswer(query.question, selected);
        return result;
    }
    filterCandidates(candidates, filters) {
        if (!filters)
            return candidates;
        return candidates.filter(candidate => {
            // Tag filter
            if (filters.tags && filters.tags.length > 0) {
                const candidateTags = candidate.metadata.tags || [];
                const hasMatchingTag = filters.tags.some(tag => candidateTags.includes(tag.toLowerCase()));
                if (!hasMatchingTag)
                    return false;
            }
            // Time range filter
            if (filters.timeRange) {
                const [start, end] = filters.timeRange;
                const occurredAt = candidate.metadata.occurredAt;
                if (occurredAt < start || occurredAt > end)
                    return false;
            }
            // Importance filter
            if (filters.importance !== undefined) {
                const importance = candidate.metadata.importance || 0;
                if (importance < filters.importance)
                    return false;
            }
            return true;
        });
    }
    async generateAnswer(question, sources) {
        // In a real implementation, this would use a local LLM
        // For now, we'll create a simple answer with citations
        const citations = [];
        const sourceTexts = [];
        for (const source of sources.slice(0, this.config.maxCitations)) {
            const startOff = 0; // Simplified - would be calculated from actual text
            const endOff = source.text.length;
            citations.push({
                chunkId: source.id,
                startOff,
                endOff,
                score: source.score,
            });
            sourceTexts.push(source.text);
        }
        // Simple answer generation (would use local LLM in production)
        const answer = this.generateSimpleAnswer(question, sourceTexts);
        const confidence = this.calculateConfidence(sources);
        return {
            answer,
            citations,
            confidence,
            sources: sources.map(s => ({
                id: s.id,
                text: s.text,
                score: s.score,
                startOff: 0,
                endOff: s.text.length,
            })),
        };
    }
    generateSimpleAnswer(question, sources) {
        // Simplified answer generation
        const context = sources.join(' ');
        return `Based on your personal memory: ${context.substring(0, 500)}...`;
    }
    calculateConfidence(sources) {
        if (sources.length === 0)
            return 0;
        const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
        const sourceCount = Math.min(sources.length / this.config.maxCitations, 1);
        return avgScore * sourceCount;
    }
}
