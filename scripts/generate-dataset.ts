#!/usr/bin/env ts-node
import fs from 'node:fs';
import path from 'node:path';

type Memory = {
  id: string;
  title?: string;
  content: string;
  tags: string[];
  source?: string;
  created_at: string;
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMemory(i: number): Memory {
  const topics = [
    {
      tag: 'dev',
      texts: [
        'Refactor module boundaries',
        'Prefer composition over inheritance',
        'Add unit tests for edge cases',
      ],
    },
    {
      tag: 'health',
      texts: ['Drink 2L of water', '10k steps goal', 'High-protein breakfast idea'],
    },
    {
      tag: 'crypto',
      texts: [
        'Rotate nonces for AES-GCM',
        'Use Argon2id for password hashing',
        'PBKDF2 fallback with sufficient iterations',
      ],
    },
    {
      tag: 'rag',
      texts: [
        'Chunk by sentences with overlap',
        'Store embeddings with metadata',
        'Retrieve Top-K with MMR',
      ],
    },
    {
      tag: 'work',
      texts: ['Prepare weekly report', 'Schedule 1:1 meeting', 'Update roadmap slide deck'],
    },
  ];

  const topic = randomChoice(topics);
  const text = randomChoice(topic.texts);
  const created = new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000).toISOString();

  return {
    id: `synth-${String(i).padStart(5, '0')}`,
    title: `${topic.tag.toUpperCase()} note #${i}`,
    content: text,
    tags: [topic.tag, 'synthetic'],
    source: 'generator',
    created_at: created,
  };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const count = Number(process.argv[2] ?? '100');
  const outDir = path.resolve('data', 'synthetic');
  ensureDir(outDir);
  const outPath = path.join(outDir, `memories_${count}.jsonl`);

  const fd = fs.openSync(outPath, 'w');
  for (let i = 1; i <= count; i++) {
    const mem = generateMemory(i);
    fs.writeSync(fd, JSON.stringify(mem) + '\n');
  }
  fs.closeSync(fd);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${count} synthetic memories to ${outPath}`);
}

main();
