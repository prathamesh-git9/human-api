/**
 * Crypto module exports
 * Provides unified interface for encryption operations
 */

// KDF exports
export {
    deriveKEK,
    verifyPassphrase,
    generateDEK,
    generateSalt,
    type KEKResult,
    type KDFConfig
} from './kdf';

// AES exports
export {
    wrapDEK,
    unwrapDEK,
    seal,
    open,
    sealString,
    openString,
    type EncryptResult,
    type WrapResult
} from './aes';

// Re-export types from types.ts
export type {
    User,
    Entry,
    Chunk,
    Vector,
    Summary,
    Citation
} from './types';


