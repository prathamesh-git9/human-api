import { z } from 'zod';
const ChunkConfigSchema = z.object({
    maxChunkSize: z.number().int().min(100).max(2000).default(500),
    overlapSize: z.number().int().min(0).max(200).default(50),
    minChunkSize: z.number().int().min(50).max(500).default(100),
});
export class ChunkProcessor {
    config;
    constructor(config = {}) {
        this.config = ChunkConfigSchema.parse({
            maxChunkSize: 500,
            overlapSize: 50,
            minChunkSize: 100,
            ...config,
        });
    }
    processText(text, entryId, occurredAt) {
        const sentences = this.splitIntoSentences(text);
        const chunks = [];
        let currentChunk = '';
        let startOff = 0;
        for (const sentence of sentences) {
            const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
            if (potentialChunk.length > this.config.maxChunkSize &&
                currentChunk.length >= this.config.minChunkSize) {
                // Finalize current chunk
                chunks.push(this.createChunk(currentChunk.trim(), entryId, startOff, startOff + currentChunk.length, occurredAt));
                // Start new chunk with overlap
                const overlap = this.getOverlap(currentChunk);
                currentChunk = overlap + sentence;
                startOff += currentChunk.length - overlap.length;
            }
            else {
                currentChunk = potentialChunk;
            }
        }
        // Add final chunk if it meets minimum size
        if (currentChunk.length >= this.config.minChunkSize) {
            chunks.push(this.createChunk(currentChunk.trim(), entryId, startOff, startOff + currentChunk.length, occurredAt));
        }
        return chunks;
    }
    splitIntoSentences(text) {
        return text
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    getOverlap(text) {
        const words = text.split(' ');
        const overlapWords = Math.floor(this.config.overlapSize / 6); // ~6 chars per word
        return words.slice(-overlapWords).join(' ');
    }
    createChunk(text, entryId, startOff, endOff, occurredAt) {
        return {
            id: crypto.randomUUID(),
            text,
            startOff,
            endOff,
            tags: this.extractTags(text),
            importance: this.calculateImportance(text),
        };
    }
    extractTags(text) {
        // Simple tag extraction - look for #hashtags and @mentions
        const tagMatches = text.match(/#\w+|@\w+/g);
        return tagMatches ? tagMatches.map(tag => tag.toLowerCase()) : [];
    }
    calculateImportance(text) {
        // Simple importance scoring based on text features
        const features = {
            length: Math.min(text.length / 1000, 1),
            questions: (text.match(/\?/g) || []).length / 10,
            exclamations: (text.match(/!/g) || []).length / 10,
            caps: (text.match(/[A-Z]/g) || []).length / text.length,
        };
        return Math.min(features.length * 0.4 +
            features.questions * 0.3 +
            features.exclamations * 0.2 +
            features.caps * 0.1, 1);
    }
}
