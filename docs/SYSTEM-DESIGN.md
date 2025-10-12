Client: Tauri desktop (React + Tailwind)
Local services:
  • Vault DB: SQLite (SQLCipher) encrypted entries + metadata
  • Vector index: LanceDB (or SQLite-VSS) for embeddings
  • LLM: Ollama (Llama 3.1 8B) for Q&A/summaries
  • STT: Whisper (CTranslate2) for voice notes
Worker: background jobs (embeddings, summaries, compaction)
RAG: dense Top-N → BM25 optional → MMR → time/tag rerank; strict citations
Security: Argon2id passphrase → wrap DEK; AES-GCM at rest; no plaintext logs
Modes: Local-first; optional Cloud Boost later (redacted Top-K only)
