import { Argon2id } from 'argon2-browser';
import { z } from 'zod';

const EncryptParamsSchema = z.object({
    plaintext: z.string(),
    password: z.string().min(8),
    salt: z.instanceof(Uint8Array).optional(),
});

const DecryptParamsSchema = z.object({
    ciphertext: z.instanceof(Uint8Array),
    nonce: z.instanceof(Uint8Array),
    password: z.string().min(8),
    salt: z.instanceof(Uint8Array),
});

export type EncryptParams = z.infer<typeof EncryptParamsSchema>;
export type DecryptParams = z.infer<typeof DecryptParamsSchema>;

export interface EncryptResult {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    salt: Uint8Array;
}

export class CryptoService {
    private static readonly SALT_LENGTH = 32;
    private static readonly NONCE_LENGTH = 12;
    private static readonly KEY_LENGTH = 32;

    static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            await Argon2id.hash({
                pass: new TextEncoder().encode(password),
                salt,
                time: 3,
                mem: 65536,
                parallelism: 4,
                hashLen: this.KEY_LENGTH,
            }),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    static async encrypt(params: EncryptParams): Promise<EncryptResult> {
        const { plaintext, password, salt } = EncryptParamsSchema.parse(params);

        const saltBytes = salt || crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const nonce = crypto.getRandomValues(new Uint8Array(this.NONCE_LENGTH));

        const key = await this.deriveKey(password, saltBytes);
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: nonce },
            key,
            new TextEncoder().encode(plaintext)
        );

        return {
            ciphertext: new Uint8Array(ciphertext),
            nonce,
            salt: saltBytes,
        };
    }

    static async decrypt(params: DecryptParams): Promise<string> {
        const { ciphertext, nonce, password, salt } = DecryptParamsSchema.parse(params);

        const key = await this.deriveKey(password, salt);
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: nonce },
            key,
            ciphertext
        );

        return new TextDecoder().decode(plaintext);
    }

    static generateSalt(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    }

    static generateNonce(): Uint8Array {
        return crypto.getRandomValues(new Uint8Array(this.NONCE_LENGTH));
    }
}
