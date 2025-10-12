/**
 * Sentence-aware text chunker
 * Splits text into overlapping chunks while preserving sentence boundaries
 */

export interface Chunk {
    start: number;
    end: number;
    text: string;
}

export interface ChunkerConfig {
    targetTokens: number;
    overlapTokens: number;
    minChunkTokens: number;
}

/**
 * Estimate token count using whitespace-based heuristic
 * This is a simple approximation - in production you'd use a proper tokenizer
 */
function estimateTokens(text: string): number {
    // More aggressive approximation: 1 token ≈ 3 characters for English text
    return Math.ceil(text.length / 3);
}

/**
 * Split text into sentences using simple regex
 * Handles common sentence endings: . ! ?
 */
function splitIntoSentences(text: string): Array<{ text: string; start: number; end: number }> {
    const sentences: Array<{ text: string; start: number; end: number }> = [];
    const sentenceRegex = /[.!?]+\s*/g;
    let lastIndex = 0;
    let match;

    while ((match = sentenceRegex.exec(text)) !== null) {
        const sentenceText = text.slice(lastIndex, match.index + match[0].length).trim();
        if (sentenceText.length > 0) {
            sentences.push({
                text: sentenceText,
                start: lastIndex,
                end: match.index + match[0].length
            });
        }
        lastIndex = match.index + match[0].length;
    }

    // Handle remaining text if no sentence ending found
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex).trim();
        if (remainingText.length > 0) {
            sentences.push({
                text: remainingText,
                start: lastIndex,
                end: text.length
            });
        }
    }

    // If no sentences found, treat entire text as one sentence
    if (sentences.length === 0 && text.trim().length > 0) {
        sentences.push({
            text: text.trim(),
            start: 0,
            end: text.length
        });
    }

    return sentences;
}

/**
 * Create overlap text from the end of a chunk
 */
function createOverlap(chunkText: string, overlapTokens: number): string {
    const words = chunkText.split(/\s+/);
    const overlapWords = Math.min(words.length, Math.ceil(overlapTokens * 0.8)); // ~0.8 words per token
    return words.slice(-overlapWords).join(' ');
}

/**
 * Chunk text into overlapping segments with sentence awareness
 */
export function chunkText(
    input: string,
    targetTokens: number = 600,
    overlapTokens: number = 80
): Chunk[] {
    if (!input || input.trim().length === 0) {
        return [];
    }

    const config: ChunkerConfig = {
        targetTokens,
        overlapTokens,
        minChunkTokens: Math.min(20, targetTokens / 8) // Much smaller minimum
    };

    const sentences = splitIntoSentences(input);
    if (sentences.length === 0) {
        return [];
    }

    const chunks: Chunk[] = [];
    let currentChunk = '';
    let currentStart = 0;
    let currentTokens = 0;

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence.text;
        const potentialTokens = estimateTokens(potentialChunk);

        // If adding this sentence would exceed target, finalize current chunk
        if (potentialTokens > config.targetTokens && currentTokens >= config.minChunkTokens) {
            // Create chunk from current content
            chunks.push({
                start: currentStart,
                end: currentStart + currentChunk.length,
                text: currentChunk.trim()
            });

            // Start new chunk with overlap
            const overlap = createOverlap(currentChunk, config.overlapTokens);
            currentChunk = overlap + (overlap ? ' ' : '') + sentence.text;
            currentStart = sentence.start - overlap.length;
            currentTokens = estimateTokens(currentChunk);
        } else {
            // Add sentence to current chunk
            currentChunk = potentialChunk;
            currentTokens = potentialTokens;
        }
    }

    // Add final chunk if it meets minimum size OR if it's the only content
    if (currentTokens >= config.minChunkTokens || (chunks.length === 0 && currentChunk.trim().length > 0)) {
        chunks.push({
            start: currentStart,
            end: currentStart + currentChunk.length,
            text: currentChunk.trim()
        });
    }

    return chunks;
}

/**
 * Chunk text with custom configuration
 */
export function chunkTextWithConfig(
    input: string,
    config: ChunkerConfig
): Chunk[] {
    return chunkText(input, config.targetTokens, config.overlapTokens);
}

/**
 * Validate that chunk offsets align with original text
 */
export function validateChunks(chunks: Chunk[], originalText: string): boolean {
    for (const chunk of chunks) {
        const extractedText = originalText.slice(chunk.start, chunk.end);
        if (extractedText !== chunk.text) {
            return false;
        }
    }
    return true;
}
