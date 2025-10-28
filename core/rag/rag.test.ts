import { describe, it, expect } from 'vitest';
import {
  buildContextBlocks,
  buildQAPrompt,
  buildEmptyContextPrompt,
  ContextSnippet,
} from './prompt';
import {
  enforceTokenBudget,
  enforceTokenBudgetWithPriority,
  getTokenCount,
  fitsWithinBudget,
} from './budget';

describe('RAG prompt builder', () => {
  const mockSnippets: ContextSnippet[] = [
    {
      entryId: 'entry1',
      start: 0,
      end: 50,
      text: 'This is the first snippet about machine learning.',
      occurredAt: Date.now() - 86400000, // 1 day ago
      tags: ['ai', 'tech'],
      score: 0.9,
    },
    {
      entryId: 'entry2',
      start: 10,
      end: 60,
      text: 'This is the second snippet about programming.',
      occurredAt: Date.now() - 172800000, // 2 days ago
      tags: ['coding'],
      score: 0.8,
    },
  ];

  describe('buildContextBlocks', () => {
    it('formats snippets correctly', () => {
      const result = buildContextBlocks(mockSnippets);
      expect(result).toContain('Entry entry1');
      expect(result).toContain('Entry entry2');
      expect(result).toContain('"This is the first snippet about machine learning."');
      expect(result).toContain('[ai, tech]');
    });

    it('handles empty snippets', () => {
      const result = buildContextBlocks([]);
      expect(result).toBe('');
    });

    it('handles snippets without tags', () => {
      const snippetWithoutTags: ContextSnippet[] = [
        {
          ...mockSnippets[0],
          tags: [],
        },
      ];
      const result = buildContextBlocks(snippetWithoutTags);
      expect(result).not.toContain('[]');
    });
  });

  describe('buildQAPrompt', () => {
    it('creates prompt with context', () => {
      const snippets = buildContextBlocks(mockSnippets);
      const result = buildQAPrompt(snippets, 'What is machine learning?');

      expect(result.system).toContain('personal memory assistant');
      expect(result.user).toContain('What is machine learning?');
      expect(result.user).toContain('Context:');
      expect(result.jsonSchema).toContain('answer');
      expect(result.jsonSchema).toContain('citations');
    });

    it('handles direct tone', () => {
      const result = buildQAPrompt('context', 'question', 'direct');
      expect(result.user).toContain('Answer directly:');
    });

    it('handles neutral tone', () => {
      const result = buildQAPrompt('context', 'question', 'neutral');
      expect(result.user).toContain('Please answer:');
    });
  });

  describe('buildEmptyContextPrompt', () => {
    it('creates prompt for empty context', () => {
      const result = buildEmptyContextPrompt('What is AI?');
      expect(result.user).toContain('No relevant information found');
      expect(result.system).toContain('Not enough context');
    });
  });
});

describe('Token budget enforcement', () => {
  describe('enforceTokenBudget', () => {
    it('returns original text if within budget', () => {
      const text = 'Short text.';
      const result = enforceTokenBudget(text, 100);
      expect(result).toBe(text);
    });

    it('truncates text that exceeds budget', () => {
      const longText =
        'This is a very long text that should be truncated when the token budget is exceeded. '.repeat(
          10
        );
      const result = enforceTokenBudget(longText, 20);
      expect(result.length).toBeLessThan(longText.length);
    });

    it('handles empty text', () => {
      expect(enforceTokenBudget('', 100)).toBe('');
      expect(enforceTokenBudget('   ', 100)).toBe('   ');
    });

    it('preserves block structure', () => {
      const blocks = 'Block 1.\n\nBlock 2.\n\nBlock 3.';
      const result = enforceTokenBudget(blocks, 10);
      expect(result).toContain('\n\n');
    });
  });

  describe('enforceTokenBudgetWithPriority', () => {
    const snippets = [
      { text: 'High priority snippet.', score: 0.9 },
      { text: 'Medium priority snippet.', score: 0.5 },
      { text: 'Low priority snippet.', score: 0.1 },
    ];

    it('prioritizes higher scored snippets', () => {
      const result = enforceTokenBudgetWithPriority(snippets, 10); // Smaller budget
      expect(result).toContain('High priority');
      expect(result).not.toContain('Low priority');
    });

    it('handles empty snippets', () => {
      const result = enforceTokenBudgetWithPriority([], 100);
      expect(result).toBe('');
    });
  });

  describe('utility functions', () => {
    it('estimates token count', () => {
      const text = 'Hello world!';
      const count = getTokenCount(text);
      expect(count).toBeGreaterThan(0);
    });

    it('checks budget fit', () => {
      const text = 'Short text.';
      expect(fitsWithinBudget(text, 100)).toBe(true);
      expect(fitsWithinBudget(text, 1)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles very long single word', () => {
      const longWord = 'a'.repeat(1000);
      const result = enforceTokenBudget(longWord, 10);
      expect(result.length).toBeLessThan(longWord.length);
    });

    it('handles text with no spaces', () => {
      const noSpaces = 'a'.repeat(100);
      const result = enforceTokenBudget(noSpaces, 10);
      expect(result.length).toBeLessThan(noSpaces.length);
    });

    it('preserves sentence boundaries when possible', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const result = enforceTokenBudget(text, 15);
      // Should try to end at sentence boundary
      expect(result).toMatch(/[.!?]$/);
    });
  });
});
