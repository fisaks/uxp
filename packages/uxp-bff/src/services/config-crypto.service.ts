import crypto from "crypto";
import env from "../config/env";

const ENC_PREFIX = "enc:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let derivedKey: Buffer | null = null;

async function getKey(): Promise<Buffer> {
    if (derivedKey) return derivedKey;

    const encryptionKey = env.UXP_ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error("UXP_ENCRYPTION_KEY is not configured");
    }

    return new Promise((resolve, reject) => {
        crypto.hkdf(
            "sha256",
            encryptionKey,
            "uxp:config:salt",
            "uxp:config:encrypt",
            32,
            (err, key) => {
                if (err) return reject(err);
                derivedKey = Buffer.from(key);
                resolve(derivedKey);
            }
        );
    });
}

async function encrypt(plaintext: string): Promise<string> {
    const key = await getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Store as enc:<base64(iv + authTag + ciphertext)>
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return ENC_PREFIX + combined.toString("base64");
}

async function decrypt(stored: string): Promise<string> {
    if (!stored.startsWith(ENC_PREFIX)) {
        // Not encrypted — return as-is (backward compat)
        return stored;
    }

    const key = await getKey();
    const combined = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

function isEncrypted(value: string): boolean {
    return value.startsWith(ENC_PREFIX);
}

export const ConfigCryptoService = {
    encrypt,
    decrypt,
    isEncrypted,
};
