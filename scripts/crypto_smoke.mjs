import { randomBytes } from 'crypto';
import { deriveKEK, generateDEK } from '../core/crypto/kdf.js';
import { wrapDEK, unwrapDEK, sealString, openString } from '../core/crypto/aes.js';

const pass = 'test-passphrase-123';

// If your deriveKEK needs a salt passed in, adapt accordingly:
const { kekKey /*, kdfSalt, iterations, keyLen */ } = await deriveKEK(pass);

const dek = generateDEK();
const { wrappedDEK, nonce: wrapNonce } = await wrapDEK(kekKey, dek);
const unwrapped = await unwrapDEK(kekKey, wrappedDEK, wrapNonce);

if (Buffer.compare(Buffer.from(dek), Buffer.from(unwrapped)) !== 0) {
  throw new Error('DEK unwrap mismatch');
}

const msg = 'hello ' + randomBytes(4).toString('hex');
const { cipher, nonce } = await sealString(unwrapped, msg);
const plain = await openString(unwrapped, cipher, nonce);
if (plain !== msg) throw new Error('Seal/Open round-trip failed');

// Tamper detection
const tampered = Buffer.from(cipher);
tampered[3] ^= 0xff;
let failed = false;
try { await openString(unwrapped, tampered, nonce); } catch { failed = true; }
if (!failed) throw new Error('Tamper not detected');

console.log('OK: crypto smoke passed');
