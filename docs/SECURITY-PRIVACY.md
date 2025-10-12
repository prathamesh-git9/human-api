• Local-first; no network calls by default
• Per-user DEK wrapped with passphrase (Argon2id)
• AES-GCM for entries/summaries; model files outside vault
• DSAR-ready: export vault (client-encrypted) and wipe vault cascade
• If Cloud Boost is enabled later: redacted Top-K only; no raw vault leaves device; EU region
