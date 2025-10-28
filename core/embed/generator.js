import { z } from 'zod';
const EmbeddingConfigSchema = z.object({
    model: z.string().default('all-MiniLM-L6-v2'),
    dimensions: z.number().int().min(128).max(1536).default(384),
    batchSize: z.number().int().min(1).max(32).default(8),
});
export class EmbeddingGenerator {
    config;
    model; // Will be loaded dynamically
    constructor(config = {}) {
        this.config = EmbeddingConfigSchema.parse({
            model: 'all-MiniLM-L6-v2',
            dimensions: 384,
            batchSize: 8,
            ...config,
        });
    }
    async initialize() {
        // In a real implementation, this would load the ONNX model
        // For now, we'll simulate initialization
        console.log(`Initializing embedding model: ${this.config.model}`);
    }
    async generateEmbedding(text) {
        // Simulate embedding generation
        // In production, this would use ONNX Runtime with a local model
        const vector = new Float32Array(this.config.dimensions);
        // Simple hash-based "embedding" for demo
        const hash = this.simpleHash(text);
        for (let i = 0; i < this.config.dimensions; i++) {
            vector[i] = Math.sin(hash + i) * 0.5 + 0.5;
        }
        return vector;
    }
    async generateBatchEmbeddings(texts) {
        const results = [];
        for (let i = 0; i < texts.length; i += this.config.batchSize) {
            const batch = texts.slice(i, i + this.config.batchSize);
            const embeddings = await Promise.all(batch.map(text => this.generateEmbedding(text)));
            for (let j = 0; j < batch.length; j++) {
                results.push({
                    id: crypto.randomUUID(),
                    vector: embeddings[j],
                    model: this.config.model,
                    createdAt: Date.now(),
                });
            }
        }
        return results;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    calculateSimilarity(a, b) {
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
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
