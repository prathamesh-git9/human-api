import { z } from 'zod';

const EmbeddingConfigSchema = z.object({
    model: z.string().default('all-MiniLM-L6-v2'),
    dimensions: z.number().int().min(128).max(1536).default(384),
    batchSize: z.number().int().min(1).max(32).default(8),
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

export interface EmbeddingResult {
    id: string;
    vector: Float32Array;
    model: string;
    createdAt: number;
}

export class EmbeddingGenerator {
    private config: EmbeddingConfig;
    private model: any; // Will be loaded dynamically

    constructor(config: Partial<EmbeddingConfig> = {}) {
        this.config = EmbeddingConfigSchema.parse({
            model: 'all-MiniLM-L6-v2',
            dimensions: 384,
            batchSize: 8,
            ...config,
        });
    }

    async initialize(): Promise<void> {
        // In a real implementation, this would load the ONNX model
        // For now, we'll simulate initialization
        console.log(`Initializing embedding model: ${this.config.model}`);
    }

    async generateEmbedding(text: string): Promise<Float32Array> {
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

    async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
        const results: EmbeddingResult[] = [];

        for (let i = 0; i < texts.length; i += this.config.batchSize) {
            const batch = texts.slice(i, i + this.config.batchSize);
            const embeddings = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );

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

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    calculateSimilarity(a: Float32Array, b: Float32Array): number {
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
