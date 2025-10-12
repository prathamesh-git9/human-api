/**
 * Token budget enforcement for context snippets
 * Truncates content while preserving structure
 */

/**
 * Simple character-based token estimation
 * In production, use a proper tokenizer
 */
function estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget
 * Preserves sentence boundaries when possible
 */
function truncateText(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Convert tokens to characters

    if (text.length <= maxChars) {
        return text;
    }

    // Try to truncate at sentence boundary
    const truncated = text.slice(0, maxChars);
    const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
    );

    // If we found a sentence boundary within reasonable distance, use it
    if (lastSentenceEnd > maxChars * 0.7) {
        return text.slice(0, lastSentenceEnd + 1);
    }

    // Otherwise, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxChars * 0.8) {
        return text.slice(0, lastSpace);
    }

    // Fallback to character truncation
    return truncated;
}

/**
 * Enforce token budget on context snippets
 * Truncates individual snippets while preserving structure
 */
export function enforceTokenBudget(
    snippets: string,
    maxTokens: number
): string {
    if (!snippets || snippets.trim().length === 0) {
        return snippets;
    }

    const currentTokens = estimateTokens(snippets);
    if (currentTokens <= maxTokens) {
        return snippets;
    }

    // Split into individual snippet blocks
    const blocks = snippets.split('\n\n');
    const truncatedBlocks: string[] = [];
    let remainingTokens = maxTokens;

    for (const block of blocks) {
        const blockTokens = estimateTokens(block);

        if (blockTokens <= remainingTokens) {
            // Block fits entirely
            truncatedBlocks.push(block);
            remainingTokens -= blockTokens;
        } else if (remainingTokens > 50) { // Minimum viable snippet size
            // Truncate block to fit remaining budget
            const truncatedBlock = truncateText(block, remainingTokens);
            if (truncatedBlock.trim().length > 0) {
                truncatedBlocks.push(truncatedBlock);
            }
            break; // No more space
        } else {
            // Not enough space for this block
            break;
        }
    }

    return truncatedBlocks.join('\n\n');
}

/**
 * Enforce budget with priority ordering
 * Keeps higher-scored snippets when truncating
 */
export function enforceTokenBudgetWithPriority(
    snippets: Array<{ text: string; score: number }>,
    maxTokens: number
): string {
    if (snippets.length === 0) {
        return '';
    }

    // Sort by score (descending)
    const sortedSnippets = [...snippets].sort((a, b) => b.score - a.score);

    const selectedSnippets: string[] = [];
    let remainingTokens = maxTokens;

    for (const snippet of sortedSnippets) {
        const snippetTokens = estimateTokens(snippet.text);

        if (snippetTokens <= remainingTokens) {
            selectedSnippets.push(snippet.text);
            remainingTokens -= snippetTokens;
        } else if (remainingTokens > 20) { // Reduced minimum size
            // Try to fit a truncated version
            const truncated = truncateText(snippet.text, remainingTokens);
            if (truncated.trim().length > 0) {
                selectedSnippets.push(truncated);
            }
            break;
        } else {
            break;
        }
    }

    return selectedSnippets.join('\n\n');
}

/**
 * Get token count for text
 */
export function getTokenCount(text: string): number {
    return estimateTokens(text);
}

/**
 * Check if text fits within token budget
 */
export function fitsWithinBudget(text: string, maxTokens: number): boolean {
    return estimateTokens(text) <= maxTokens;
}
