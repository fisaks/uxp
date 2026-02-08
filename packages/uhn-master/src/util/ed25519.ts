import {
    createPrivateKey,
    createPublicKey,
    sign as cryptoSign,
    verify as cryptoVerify,
    generateKeyPairSync,
    KeyObject,
} from "crypto";

/**
 * Generate a new Ed25519 keypair
 */
export function generateKeyPair(): {
    privateKey: KeyObject;
    publicKey: KeyObject;
} {
    return generateKeyPairSync("ed25519");
}

export function getPublicKeyFromPrivate(privateKey: KeyObject): KeyObject {
    return createPublicKey(privateKey);
}
/**
 * Sign data
 */
export function sign(
    data: NodeJS.ArrayBufferView,
    privateKey: KeyObject
): Buffer {
    return cryptoSign(null, data, privateKey);
}

/**
 * Verify signature
 */
export function verify(
    data: NodeJS.ArrayBufferView,
    signature: NodeJS.ArrayBufferView,
    publicKey: KeyObject
): boolean {
    return cryptoVerify(
        null,
        data,
        publicKey,
        signature
    );
}

/**
 * Export keys for storage / transport
 */
export function exportPrivateKeyBase64(
    privateKey: KeyObject
): string {
    const der = privateKey.export({
        format: "der",
        type: "pkcs8",
    }) as Buffer;

    return der.toString("base64");
}
export function exportPublicKeyBase64(
    publicKey: KeyObject
): string {
    const der = publicKey.export({
        format: "der",
        type: "spki",
    }) as Buffer;

    return der.toString("base64");
}
/**
 * Import keys
 */
export function importPrivateKeyBase64(
    base64: string
): KeyObject {
    return createPrivateKey({
        key: Buffer.from(base64, "base64"),
        format: "der",
        type: "pkcs8",
    });
}

export function importPublicKeyBase64(
    base64: string
): KeyObject {
    return createPublicKey({
        key: Buffer.from(base64, "base64"),
        format: "der",
        type: "spki",
    });
}