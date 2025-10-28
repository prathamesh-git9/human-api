import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { chunkText } from '../chunk/chunker';

type Memory = {
  id?: string;
  title?: string;
  content: string;
  tags: string[];
  source?: string;
  created_at?: string;
};

function readJsonl(filePath: string): Memory[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => JSON.parse(line));
}

describe('Synthetic dataset basic RAG flow', () => {
  const datasetPath = path.resolve('data', 'small', 'memories.jsonl');

  it('dataset exists and is readable', () => {
    expect(fs.existsSync(datasetPath)).toBe(true);
    const stats = fs.statSync(datasetPath);
    expect(stats.size).toBeGreaterThan(100);
  });

  it('can parse JSONL and chunk contents', () => {
    const rows = readJsonl(datasetPath);
    expect(rows.length).toBeGreaterThan(5);
    const text = rows.map((r) => r.content).join('\n');
    const chunks = chunkText(text, 80, 20); // small token targets
    expect(chunks.length).toBeGreaterThan(3);
    // Ensure offsets are monotonic
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start).toBeGreaterThanOrEqual(chunks[i - 1].start);
    }
  });
});


