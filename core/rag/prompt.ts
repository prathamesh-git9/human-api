/**
 * Prompt builder for RAG system
 * Creates system prompts and user queries with context
 */

export interface ContextSnippet {
  entryId: string;
  start: number;
  end: number;
  text: string;
  occurredAt: number;
  tags: string[];
  score: number;
}

export interface QAPrompt {
  system: string;
  user: string;
  jsonSchema: string;
}

export type UserTone = 'direct' | 'neutral';

/**
 * Build context blocks from retrieved snippets
 */
export function buildContextBlocks(snippets: ContextSnippet[]): string {
  if (snippets.length === 0) {
    return '';
  }

  const blocks = snippets.map((snippet, index) => {
    const date = new Date(snippet.occurredAt).toISOString().split('T')[0];
    const tags = snippet.tags.length > 0 ? ` [${snippet.tags.join(', ')}]` : '';
    
    return `${index + 1}. Entry ${snippet.entryId} (${date})${tags}:\n"${snippet.text}"`;
  });

  return blocks.join('\n\n');
}

/**
 * Build QA prompt with context and question
 */
export function buildQAPrompt(
  snippets: string,
  question: string,
  userTone: UserTone = 'neutral'
): QAPrompt {
  const systemPrompt = `You are a personal memory assistant. Answer ONLY using the provided snippets. If insufficient, return JSON: {"answer":"Not enough context","citations":[],"confidence":0}. Always return strict JSON: {"answer": string, "citations": [{"entryId":string,"start":number,"end":number}], "confidence": number}.`;

  const tonePrefix = userTone === 'direct' ? 'Answer directly: ' : 'Please answer: ';
  const userPrompt = `${tonePrefix}${question}\n\nContext:\n${snippets}`;

  const jsonSchema = `{
  "answer": "string - your response based on the context",
  "citations": [
    {
      "entryId": "string - ID of the source entry",
      "start": "number - start character offset in the entry",
      "end": "number - end character offset in the entry"
    }
  ],
  "confidence": "number - confidence score between 0 and 1"
}`;

  return {
    system: systemPrompt,
    user: userPrompt,
    jsonSchema
  };
}

/**
 * Handle empty context case
 */
export function buildEmptyContextPrompt(question: string): QAPrompt {
  return {
    system: `You are a personal memory assistant. Answer ONLY using the provided snippets. If insufficient, return JSON: {"answer":"Not enough context","citations":[],"confidence":0}. Always return strict JSON: {"answer": string, "citations": [{"entryId":string,"start":number,"end":number}], "confidence": number}.`,
    user: `Please answer: ${question}\n\nContext: No relevant information found.`,
    jsonSchema: `{
  "answer": "string - your response based on the context",
  "citations": [
    {
      "entryId": "string - ID of the source entry", 
      "start": "number - start character offset in the entry",
      "end": "number - end character offset in the entry"
    }
  ],
  "confidence": "number - confidence score between 0 and 1"
}`
  };
}
