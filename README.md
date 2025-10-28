# Human API

A local-first personal memory & reasoning system built with Tauri, React, and TypeScript.

## 🎯 Vision

Ask "your memory" and get sourced, trustworthy answers — locally, with citations.

## 🏗️ Architecture

### Core Components

- **Crypto**: Argon2id + AES-GCM encryption for local-first security
- **Chunking**: Smart text preprocessing with overlap and importance scoring
- **Embeddings**: Local embedding generation (simulated, ready for ONNX models)
- **MMR**: Maximum Marginal Relevance for diverse, relevant results
- **RAG**: Complete retrieval pipeline with citation tracking

### Desktop App

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Tauri (Rust) with SQLite + LanceDB
- **Worker**: Background embedding processing with retry logic

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📁 Project Structure

```
human-api/
├── apps/desktop/          # Tauri desktop application
├── core/                  # Core business logic
│   ├── crypto/           # Encryption & security
│   ├── chunk/            # Text chunking
│   ├── embed/            # Embedding generation
│   ├── mmr/              # MMR selection
│   ├── rag/              # RAG pipeline
│   └── sql/              # Database schema
├── workers/              # Background workers
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## 🔐 Security & Privacy

- **Local-first**: No network calls by default
- **Encrypted at rest**: Argon2id + AES-GCM
- **DSAR-ready**: Export and wipe capabilities
- **No plaintext logs**: All sensitive data encrypted

## 🧪 Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

## 🚀 CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **Test Suite**: Runs on Node.js 18.x and 20.x
- **Build**: Cross-platform builds for Windows, macOS, and Linux
- **Security**: Automated security audits and vulnerability scanning
- **Linting**: Code quality and formatting checks
- **Release**: Automated releases on main branch pushes

## 📋 Milestones

- **M1**: Vault, write path, embeddings, basic query, citations ✅
- **M2**: Whisper queue, daily/weekly insights, MMR
- **M3**: Compaction, chapter embeddings
- **M4**: Installer, auto-update, performance, recovery

## 🎨 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Tauri 2 + Rust
- **Database**: SQLite (SQLCipher) + LanceDB
- **LLM**: Ollama (Llama 3.1 8B)
- **STT**: Whisper (CTranslate2)
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint + Prettier

## 🛠️ Available Scripts

- `npm test` - Run test suite
- `npm run test:cov` - Run tests with coverage
- `npm run test:ui` - Run tests with UI
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code
- `npm run format:check` - Check code formatting
- `npm run build` - Build all packages
- `npm run dev` - Start development server
- `npm run clean` - Clean build artifacts

## 📄 License

MIT License - see LICENSE file for details.
