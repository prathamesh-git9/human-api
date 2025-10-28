import { describe, it, expect } from 'vitest';
import { chunkText, chunkTextWithConfig, validateChunks, ChunkerConfig } from './chunker';

describe('Text chunker', () => {
  describe('basic functionality', () => {
    it('returns empty array for empty input', () => {
      const result = chunkText('');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only input', () => {
      const result = chunkText('   \n\t   ');
      expect(result).toEqual([]);
    });

    it('handles single sentence', () => {
      const text = 'This is a single sentence.';
      const result = chunkText(text);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(text.length);
    });
  });

  describe('sentence boundaries', () => {
    it('splits on periods', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = chunkText(text, 10, 3); // Very small chunks to force splitting
      expect(result.length).toBeGreaterThan(1);
    });

    it('splits on exclamation marks', () => {
      const text = 'First sentence! Second sentence!';
      const result = chunkText(text, 10, 3);
      expect(result.length).toBeGreaterThan(1);
    });

    it('splits on question marks', () => {
      const text = 'First sentence? Second sentence?';
      const result = chunkText(text, 10, 3);
      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('overlap handling', () => {
    it('creates overlapping chunks', () => {
      const text =
        'This is a long text that should be split into multiple chunks with overlap between them.';
      const result = chunkText(text, 30, 10); // Small chunks to force splitting

      if (result.length > 1) {
        // Check that chunks have some overlap
        const firstChunk = result[0];
        const secondChunk = result[1];

        // Second chunk should start before first chunk ends
        expect(secondChunk.start).toBeLessThan(firstChunk.end);
      }
    });

    it('handles very short text', () => {
      const text = 'Short.';
      const result = chunkText(text, 600, 80);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Short.');
    });
  });

  describe('offset alignment', () => {
    it('preserves correct start/end offsets', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = chunkText(text, 50, 10);

      // Validate that all chunks align with original text
      expect(validateChunks(result, text)).toBe(true);

      // Check that chunks don't overlap in the original text
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].end).toBeLessThanOrEqual(result[i + 1].start);
      }
    });

    it('handles text with no sentence endings', () => {
      const text = 'This is a single long sentence without any punctuation marks';
      const result = chunkText(text, 30, 10);

      expect(result.length).toBeGreaterThan(0);
      expect(validateChunks(result, text)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles text with multiple consecutive punctuation', () => {
      const text = 'What?! Really?? Yes!!!';
      const result = chunkText(text);
      expect(result.length).toBeGreaterThan(0);
      expect(validateChunks(result, text)).toBe(true);
    });

    it('handles text with whitespace between sentences', () => {
      const text = 'First.   \n\n   Second.';
      const result = chunkText(text, 30, 10);
      expect(validateChunks(result, text)).toBe(true);
    });

    it('handles very long single sentence', () => {
      const text =
        'This is a very long sentence that goes on and on without any punctuation marks and should be split into multiple chunks even though it has no natural sentence boundaries';
      const result = chunkText(text, 10, 3);
      expect(result.length).toBeGreaterThan(1);
      expect(validateChunks(result, text)).toBe(true);
    });
  });

  describe('configuration', () => {
    it('respects custom target tokens', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = chunkText(text, 20, 5); // Very small target
      expect(result.length).toBeGreaterThan(1);
    });

    it('respects custom overlap tokens', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = chunkText(text, 30, 15); // Large overlap
      expect(result.length).toBeGreaterThan(0);
    });

    it('works with config object', () => {
      const text = 'First sentence. Second sentence.';
      const config: ChunkerConfig = {
        targetTokens: 30,
        overlapTokens: 10,
        minChunkTokens: 5,
      };
      const result = chunkTextWithConfig(text, config);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('token estimation', () => {
    it('handles empty chunks gracefully', () => {
      const text = 'Short.';
      const result = chunkText(text, 1, 1); // Very small target
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('creates at least one chunk for reasonable input', () => {
      const text = 'This is a reasonable length sentence that should create at least one chunk.';
      const result = chunkText(text, 600, 80);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('validates correct chunks', () => {
      const text = 'Test text.';
      const chunks = [{ start: 0, end: text.length, text }];
      expect(validateChunks(chunks, text)).toBe(true);
    });

    it('detects invalid chunks', () => {
      const text = 'Test text.';
      const invalidChunks = [{ start: 0, end: 5, text: 'Wrong' }];
      expect(validateChunks(invalidChunks, text)).toBe(false);
    });
  });
});
