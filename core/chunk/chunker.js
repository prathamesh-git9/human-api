/**
 * Sentence-aware text chunker
 * Splits text into overlapping chunks while preserving sentence boundaries
 */
/**
 * Estimate token count using whitespace-based heuristic
 * This is a simple approximation - in production you'd use a proper tokenizer
 */
function estimateTokens(text) {
    // More aggressive approximation: 1 token ≈ 3 characters for English text
    return Math.ceil(text.length / 3);
}
/**
 * Split text into sentences using simple regex
 * Handles common sentence endings: . ! ?
 */
function splitIntoSentences(text) {
    const sentences = [];
    const sentenceRegex = /[.!?]+\s*/g;
    let lastIndex = 0;
    let match;
    while ((match = sentenceRegex.exec(text)) !== null) {
        const sentenceText = text.slice(lastIndex, match.index + match[0].length).trim();
        if (sentenceText.length > 0) {
            sentences.push({
                text: sentenceText,
                start: lastIndex,
                end: match.index + match[0].length,
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
                end: text.length,
            });
        }
    }
    // If no sentences found, treat entire text as one sentence
    if (sentences.length === 0 && text.trim().length > 0) {
        sentences.push({
            text: text.trim(),
            start: 0,
            end: text.length,
        });
    }
    return sentences;
}
/**
 * Create overlap text from the end of a chunk
 */
function createOverlap(chunkText, overlapTokens) {
    const words = chunkText.split(/\s+/);
    const overlapWords = Math.min(words.length, Math.ceil(overlapTokens * 0.8)); // ~0.8 words per token
    return words.slice(-overlapWords).join(' ');
}
/**
 * Chunk text into overlapping segments with sentence awareness
 */
export function chunkText(input, targetTokens = 600, overlapTokens = 80) {
    if (!input || input.trim().length === 0) {
        return [];
    }
    const config = {
        targetTokens,
        overlapTokens,
        minChunkTokens: Math.min(20, targetTokens / 8), // Much smaller minimum
    };
    const sentences = splitIntoSentences(input);
    if (sentences.length === 0) {
        return [];
    }
    const chunks = [];
    let currentStart = 0;
    let currentEnd = 0;
    let currentTokens = 0;
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceTokens = estimateTokens(sentence.text);
        // If single sentence exceeds target, we need to split it
        if (sentenceTokens > config.targetTokens) {
            // Finalize current chunk if it has content
            if (currentEnd > currentStart) {
                const chunkText = input.slice(currentStart, currentEnd).trim();
                if (chunkText.length > 0) {
                    chunks.push({
                        start: currentStart,
                        end: currentEnd,
                        text: chunkText,
                    });
                }
            }
            // Split the long sentence by words
            const words = sentence.text.split(/\s+/);
            let wordStart = sentence.start;
            let wordEnd = sentence.start;
            for (const word of words) {
                const wordIndex = sentence.text.indexOf(word, wordEnd - sentence.start);
                const newWordEnd = sentence.start + wordIndex + word.length;
                const wordChunkText = input.slice(wordStart, newWordEnd);
                const wordChunkTokens = estimateTokens(wordChunkText);
                if (wordChunkTokens > config.targetTokens && wordEnd > wordStart) {
                    // Create chunk from current word chunk
                    const chunkText = input.slice(wordStart, wordEnd).trim();
                    if (chunkText.length > 0) {
                        chunks.push({
                            start: wordStart,
                            end: wordEnd,
                            text: chunkText,
                        });
                    }
                    // Start new word chunk
                    wordStart = sentence.start + wordIndex;
                    wordEnd = newWordEnd;
                }
                else {
                    wordEnd = newWordEnd;
                }
            }
            // Add final word chunk if it has content
            if (wordEnd > wordStart) {
                const chunkText = input.slice(wordStart, wordEnd).trim();
                if (chunkText.length > 0) {
                    chunks.push({
                        start: wordStart,
                        end: wordEnd,
                        text: chunkText,
                    });
                }
            }
            // Reset for next sentence
            currentStart = 0;
            currentEnd = 0;
            currentTokens = 0;
            continue;
        }
        const potentialEnd = sentence.end;
        const potentialChunkText = input.slice(currentStart, potentialEnd);
        const potentialTokens = estimateTokens(potentialChunkText);
        // If adding this sentence would exceed target, finalize current chunk
        if (potentialTokens > config.targetTokens && currentTokens >= config.minChunkTokens) {
            // Create chunk from current content
            const chunkText = input.slice(currentStart, currentEnd).trim();
            if (chunkText.length > 0) {
                chunks.push({
                    start: currentStart,
                    end: currentEnd,
                    text: chunkText,
                });
            }
            // Start new chunk with overlap
            const overlap = createOverlap(chunkText, config.overlapTokens);
            currentStart = Math.max(0, currentEnd - overlap.length);
            currentEnd = potentialEnd;
            currentTokens = estimateTokens(input.slice(currentStart, currentEnd));
        }
        else {
            // Add sentence to current chunk
            currentEnd = potentialEnd;
            currentTokens = potentialTokens;
        }
    }
    // Add final chunk if it meets minimum size OR if it's the only content
    if (currentTokens >= config.minChunkTokens ||
        (chunks.length === 0 && currentEnd > currentStart)) {
        const chunkText = input.slice(currentStart, currentEnd).trim();
        if (chunkText.length > 0) {
            chunks.push({
                start: currentStart,
                end: currentEnd,
                text: chunkText,
            });
        }
    }
    // If we still have no chunks and the text is long enough, force create at least one chunk
    if (chunks.length === 0 && input.trim().length > 0) {
        // Split by words if sentences are too long
        const words = input.trim().split(/\s+/);
        let wordStart = 0;
        let wordEnd = 0;
        for (const word of words) {
            const wordIndex = input.indexOf(word, wordEnd);
            const newWordEnd = wordIndex + word.length;
            const wordChunkText = input.slice(wordStart, newWordEnd);
            const wordChunkTokens = estimateTokens(wordChunkText);
            if (wordChunkTokens > config.targetTokens && wordEnd > wordStart) {
                // Create chunk from current word chunk
                const chunkText = input.slice(wordStart, wordEnd).trim();
                if (chunkText.length > 0) {
                    chunks.push({
                        start: wordStart,
                        end: wordEnd,
                        text: chunkText,
                    });
                }
                // Start new word chunk
                wordStart = wordIndex;
                wordEnd = newWordEnd;
            }
            else {
                wordEnd = newWordEnd;
            }
        }
        // Add final word chunk if it has content
        if (wordEnd > wordStart) {
            const chunkText = input.slice(wordStart, wordEnd).trim();
            if (chunkText.length > 0) {
                chunks.push({
                    start: wordStart,
                    end: wordEnd,
                    text: chunkText,
                });
            }
        }
    }
    return chunks;
}
/**
 * Chunk text with custom configuration
 */
export function chunkTextWithConfig(input, config) {
    return chunkText(input, config.targetTokens, config.overlapTokens);
}
/**
 * Validate that chunk offsets align with original text
 */
export function validateChunks(chunks, originalText) {
    for (const chunk of chunks) {
        const extractedText = originalText.slice(chunk.start, chunk.end);
        if (extractedText !== chunk.text) {
            return false;
        }
    }
    return true;
}
