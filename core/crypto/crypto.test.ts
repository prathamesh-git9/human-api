import { describe, it, expect } from 'vitest';
import { 
  deriveKEK, 
  verifyPassphrase, 
  generateDEK, 
  generateSalt,
  wrapDEK,
  unwrapDEK,
  seal,
  open,
  sealString,
  openString
} from './index';

describe('Crypto utilities', () => {
  const testPassphrase = 'test-passphrase-123';
  const testData = new TextEncoder().encode('Hello, World!');
  const testString = 'Hello, World!';

  describe('KDF functions', () => {
    it('derives KEK from passphrase', async () => {
      const result = await deriveKEK(testPassphrase);
      
      expect(result.kdfSalt).toBeInstanceOf(Uint8Array);
      expect(result.kekKey).toBeInstanceOf(Uint8Array);
      expect(result.kdfSalt.length).toBe(32);
      expect(result.kekKey.length).toBe(32);
    });

    it('generates different salts for same passphrase', async () => {
      const result1 = await deriveKEK(testPassphrase);
      const result2 = await deriveKEK(testPassphrase);
      
      expect(result1.kdfSalt).not.toEqual(result2.kdfSalt);
      expect(result1.kekKey).not.toEqual(result2.kekKey);
    });

    it('verifies correct passphrase', async () => {
      // Use a fixed salt for testing
      const fixedSalt = new Uint8Array(32);
      fixedSalt.fill(0x42); // Fill with a test pattern
      
      // Derive key with fixed salt
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(testPassphrase),
        'PBKDF2',
        false,
        ['deriveBits']
      );
      
      const kekKey = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: fixedSalt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      
      const kekKeyArray = new Uint8Array(kekKey);
      
      // Now verify with the same salt
      const isValid = await verifyPassphrase(
        testPassphrase,
        fixedSalt,
        kekKeyArray
      );
      
      expect(isValid).toBe(true);
    });

    it('rejects wrong passphrase', async () => {
      const result = await deriveKEK(testPassphrase);
      const isValid = await verifyPassphrase(
        'wrong-passphrase',
        result.kdfSalt,
        result.kekKey
      );
      
      expect(isValid).toBe(false);
    });

    it('generates random DEK', () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      
      expect(dek1).toBeInstanceOf(Uint8Array);
      expect(dek1.length).toBe(32);
      expect(dek1).not.toEqual(dek2);
    });

    it('generates random salt', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      
      expect(salt1).toBeInstanceOf(Uint8Array);
      expect(salt1.length).toBe(32);
      expect(salt1).not.toEqual(salt2);
    });

    it('throws error for short passphrase', async () => {
      await expect(deriveKEK('short')).rejects.toThrow('Passphrase must be at least 8 characters');
    });
  });

  describe('AES-GCM functions', () => {
    let kekKey: Uint8Array;
    let dek: Uint8Array;

    beforeEach(async () => {
      const kekResult = await deriveKEK(testPassphrase);
      kekKey = kekResult.kekKey;
      dek = generateDEK();
    });

    describe('DEK wrapping', () => {
      it('wraps and unwraps DEK successfully', async () => {
        const wrapped = await wrapDEK(kekKey, dek);
        const unwrapped = await unwrapDEK(kekKey, wrapped.wrappedDEK, wrapped.nonce);
        
        expect(unwrapped).toEqual(dek);
      });

      it('fails to unwrap with wrong KEK', async () => {
        const wrongKEK = generateDEK();
        const wrapped = await wrapDEK(kekKey, dek);
        
        await expect(
          unwrapDEK(wrongKEK, wrapped.wrappedDEK, wrapped.nonce)
        ).rejects.toThrow('DEK unwrapping failed');
      });

      it('fails to unwrap with tampered data', async () => {
        const wrapped = await wrapDEK(kekKey, dek);
        const tampered = new Uint8Array(wrapped.wrappedDEK);
        tampered[0] ^= 1; // Flip one bit
        
        await expect(
          unwrapDEK(kekKey, tampered, wrapped.nonce)
        ).rejects.toThrow('DEK unwrapping failed');
      });

      it('throws error for invalid DEK size', async () => {
        const invalidDEK = new Uint8Array(16); // Wrong size
        
        await expect(wrapDEK(kekKey, invalidDEK)).rejects.toThrow('DEK must be 256 bits (32 bytes)');
      });
    });

    describe('Data encryption', () => {
      it('encrypts and decrypts data successfully', async () => {
        const encrypted = await seal(dek, testData);
        const decrypted = await open(dek, encrypted.cipher, encrypted.nonce);
        
        expect(decrypted).toEqual(testData);
      });

      it('encrypts and decrypts strings successfully', async () => {
        const encrypted = await sealString(dek, testString);
        const decrypted = await openString(dek, encrypted.cipher, encrypted.nonce);
        
        expect(decrypted).toBe(testString);
      });

      it('fails to decrypt with wrong DEK', async () => {
        const wrongDEK = generateDEK();
        const encrypted = await seal(dek, testData);
        
        await expect(
          open(wrongDEK, encrypted.cipher, encrypted.nonce)
        ).rejects.toThrow('Decryption failed');
      });

      it('fails to decrypt with tampered cipher', async () => {
        const encrypted = await seal(dek, testData);
        const tampered = new Uint8Array(encrypted.cipher);
        tampered[0] ^= 1; // Flip one bit
        
        await expect(
          open(dek, tampered, encrypted.nonce)
        ).rejects.toThrow('Decryption failed');
      });

      it('fails to decrypt with wrong nonce', async () => {
        const encrypted = await seal(dek, testData);
        const wrongNonce = crypto.getRandomValues(new Uint8Array(12));
        
        await expect(
          open(dek, encrypted.cipher, wrongNonce)
        ).rejects.toThrow('Decryption failed');
      });
    });

    describe('Round-trip tests', () => {
      it('complete encryption flow works', async () => {
        // 1. Derive KEK from passphrase
        const kekResult = await deriveKEK(testPassphrase);
        
        // 2. Generate and wrap DEK
        const dek = generateDEK();
        const wrappedDEK = await wrapDEK(kekResult.kekKey, dek);
        
        // 3. Encrypt data with DEK
        const encrypted = await sealString(dek, testString);
        
        // 4. Unwrap DEK
        const unwrappedDEK = await unwrapDEK(kekResult.kekKey, wrappedDEK.wrappedDEK, wrappedDEK.nonce);
        
        // 5. Decrypt data
        const decrypted = await openString(unwrappedDEK, encrypted.cipher, encrypted.nonce);
        
        expect(decrypted).toBe(testString);
      });

      it('handles empty data', async () => {
        const emptyData = new Uint8Array(0);
        const encrypted = await seal(dek, emptyData);
        const decrypted = await open(dek, encrypted.cipher, encrypted.nonce);
        
        expect(decrypted).toEqual(emptyData);
      });

      it('handles large data', async () => {
        const largeData = new Uint8Array(10000);
        crypto.getRandomValues(largeData);
        
        const encrypted = await seal(dek, largeData);
        const decrypted = await open(dek, encrypted.cipher, encrypted.nonce);
        
        expect(decrypted).toEqual(largeData);
      });
    });
  });
});
