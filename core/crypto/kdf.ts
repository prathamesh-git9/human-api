/**
 * Key Derivation Functions using PBKDF2
 * Derives KEK (Key Encryption Key) from passphrase
 */

export interface KEKResult {
  kdfSalt: Uint8Array;
  kekKey: Uint8Array;
}

export interface KDFConfig {
  iterations: number;
  hashLength: number;
}

const DEFAULT_KDF_CONFIG: KDFConfig = {
  iterations: 100000,  // 100k iterations for security
  hashLength: 32        // 256-bit key
};

/**
 * Derive KEK from passphrase using PBKDF2
 * 
 * @param passphrase - User's passphrase
 * @param config - Optional KDF configuration
 * @returns Object containing salt and derived key
 */
export async function deriveKEK(
  passphrase: string,
  config: Partial<KDFConfig> = {}
): Promise<KEKResult> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters');
  }

  const kdfConfig = { ...DEFAULT_KDF_CONFIG, ...config };
  
  // Generate random salt
  const kdfSalt = crypto.getRandomValues(new Uint8Array(32));
  
  try {
    // Import passphrase as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive key using PBKDF2
    const kekKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: kdfSalt,
        iterations: kdfConfig.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      kdfConfig.hashLength * 8 // Convert bytes to bits
    );

    return {
      kdfSalt,
      kekKey: new Uint8Array(kekKey)
    };
  } catch (error) {
    throw new Error(`Key derivation failed: ${error}`);
  }
}

/**
 * Verify passphrase against stored salt and key
 * 
 * @param passphrase - User's passphrase
 * @param kdfSalt - Stored salt
 * @param expectedKey - Expected derived key
 * @returns True if passphrase is correct
 */
export async function verifyPassphrase(
  passphrase: string,
  kdfSalt: Uint8Array,
  expectedKey: Uint8Array
): Promise<boolean> {
  try {
    // Import passphrase as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive key using stored salt
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: kdfSalt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256 // 256 bits
    );

    const derivedKeyArray = new Uint8Array(derivedKey);
    
    // Use timing-safe comparison
    if (derivedKeyArray.length !== expectedKey.length) {
      return false;
    }
    
    return crypto.subtle.timingSafeEqual(derivedKeyArray, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Generate a random DEK (Data Encryption Key)
 * 
 * @returns Random 256-bit key
 */
export function generateDEK(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Generate a random salt for KDF
 * 
 * @returns Random 256-bit salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}
