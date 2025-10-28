import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int().positive(),
  kdfSalt: z.instanceof(Uint8Array),
  wrappedDek: z.instanceof(Uint8Array),
});

export const EntrySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int().positive(),
  occurredAt: z.number().int().positive(),
  title: z.string().min(1),
  contentCipher: z.instanceof(Uint8Array),
  nonce: z.instanceof(Uint8Array),
  contentHash: z.string().min(1),
  moodScore: z.number().int().min(-10).max(10).default(0),
  tags: z.string().default(''),
  pinned: z.boolean().default(false),
});

export const ChunkSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
  startOff: z.number().int().min(0),
  endOff: z.number().int().min(0),
  occurredAt: z.number().int().positive(),
  tags: z.string().default(''),
  importance: z.number().min(0).max(1).default(0),
});

export const VectorSchema = z.object({
  id: z.string().uuid(),
  chunkId: z.string().uuid(),
  model: z.string().min(1),
  createdAt: z.number().int().positive(),
});

export const SummarySchema = z.object({
  id: z.string().uuid(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  periodStart: z.number().int().positive(),
  cipher: z.instanceof(Uint8Array),
  nonce: z.instanceof(Uint8Array),
  citations: z.string().min(1),
});

export const CitationSchema = z.object({
  chunkId: z.string().uuid(),
  startOff: z.number().int().min(0),
  endOff: z.number().int().min(0),
  score: z.number().min(0).max(1),
});

export type User = z.infer<typeof UserSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Chunk = z.infer<typeof ChunkSchema>;
export type Vector = z.infer<typeof VectorSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type Citation = z.infer<typeof CitationSchema>;
