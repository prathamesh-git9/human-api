PRAGMA foreign_keys=ON;

-- Users table with KDF salt and wrapped DEK
CREATE TABLE users(
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  kdf_salt BLOB NOT NULL,
  wrapped_dek BLOB NOT NULL
);

-- Entries with encrypted content
CREATE TABLE entries(
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_cipher BLOB NOT NULL,
  nonce BLOB NOT NULL,
  content_hash TEXT NOT NULL,
  mood_score INTEGER DEFAULT 0,
  tags TEXT DEFAULT '',
  pinned INTEGER DEFAULT 0
);

-- Text chunks for embedding
CREATE TABLE chunks(
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  start_off INTEGER NOT NULL,
  end_off INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL,
  tags TEXT DEFAULT '',
  importance REAL DEFAULT 0.0
);

-- Vector embeddings
CREATE TABLE vectors(
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Encrypted summaries
CREATE TABLE summaries(
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  period_start INTEGER NOT NULL,
  cipher BLOB NOT NULL,
  nonce BLOB NOT NULL,
  citations TEXT NOT NULL
);

-- Audit log
CREATE TABLE audit(
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  action TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  meta TEXT DEFAULT ''
);

-- Indexes for performance
CREATE INDEX idx_entries_occurred_at ON entries(occurred_at);
CREATE INDEX idx_chunks_entry_id ON chunks(entry_id);
CREATE INDEX idx_chunks_occurred_at ON chunks(occurred_at);
CREATE INDEX idx_vectors_chunk_id ON vectors(chunk_id);
CREATE INDEX idx_audit_ts ON audit(ts);