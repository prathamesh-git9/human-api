/**
 * AES-GCM encryption utilities
 * Handles DEK wrapping/unwrapping and data encryption/decryption
 */
/**
 * Import raw key material as CryptoKey
 */
async function importKey(keyMaterial) {
    return crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
    ]);
}
/**
 * Generate random nonce for AES-GCM
 */
function generateNonce() {
    return crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
}
/**
 * Wrap DEK using KEK (Key Encryption Key)
 *
 * @param kekKey - Key Encryption Key
 * @param dekPlain - Plaintext DEK to wrap
 * @returns Wrapped DEK with nonce
 */
export async function wrapDEK(kekKey, dekPlain) {
    if (dekPlain.length !== 32) {
        throw new Error('DEK must be 256 bits (32 bytes)');
    }
    const key = await importKey(kekKey);
    const nonce = generateNonce();
    try {
        const wrappedDEK = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, dekPlain);
        return {
            wrappedDEK: new Uint8Array(wrappedDEK),
            nonce,
        };
    }
    catch (error) {
        throw new Error(`DEK wrapping failed: ${error}`);
    }
}
/**
 * Unwrap DEK using KEK
 *
 * @param kekKey - Key Encryption Key
 * @param wrappedDEK - Wrapped DEK
 * @param nonce - Nonce used for wrapping
 * @returns Plaintext DEK
 */
export async function unwrapDEK(kekKey, wrappedDEK, nonce) {
    const key = await importKey(kekKey);
    try {
        const dekPlain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, wrappedDEK);
        return new Uint8Array(dekPlain);
    }
    catch (error) {
        throw new Error(`DEK unwrapping failed: ${error}`);
    }
}
/**
 * Encrypt plaintext using DEK
 *
 * @param dek - Data Encryption Key
 * @param plaintext - Data to encrypt
 * @returns Encrypted data with nonce
 */
export async function seal(dek, plaintext) {
    const key = await importKey(dek);
    const nonce = generateNonce();
    try {
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plaintext);
        return {
            cipher: new Uint8Array(cipher),
            nonce,
        };
    }
    catch (error) {
        throw new Error(`Encryption failed: ${error}`);
    }
}
/**
 * Decrypt ciphertext using DEK
 *
 * @param dek - Data Encryption Key
 * @param cipher - Encrypted data
 * @param nonce - Nonce used for encryption
 * @returns Plaintext data
 */
export async function open(dek, cipher, nonce) {
    const key = await importKey(dek);
    try {
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher);
        return new Uint8Array(plaintext);
    }
    catch (error) {
        throw new Error(`Decryption failed: ${error}`);
    }
}
/**
 * Encrypt string data
 *
 * @param dek - Data Encryption Key
 * @param text - String to encrypt
 * @returns Encrypted data with nonce
 */
export async function sealString(dek, text) {
    const plaintext = new TextEncoder().encode(text);
    return seal(dek, plaintext);
}
/**
 * Decrypt to string data
 *
 * @param dek - Data Encryption Key
 * @param cipher - Encrypted data
 * @param nonce - Nonce used for encryption
 * @returns Decrypted string
 */
export async function openString(dek, cipher, nonce) {
    const plaintext = await open(dek, cipher, nonce);
    return new TextDecoder().decode(plaintext);
}
