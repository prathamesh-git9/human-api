/**
 * Crypto module exports
 * Provides unified interface for encryption operations
 */
// KDF exports
export { deriveKEK, verifyPassphrase, generateDEK, generateSalt, } from './kdf';
// AES exports
export { wrapDEK, unwrapDEK, seal, open, sealString, openString, } from './aes';
