import { KeyObject } from "crypto";
import fs from "fs/promises";
import path from "path";
import {
    exportPrivateKeyBase64,
    exportPublicKeyBase64,
    generateKeyPair,
    getPublicKeyFromPrivate,
    importPrivateKeyBase64,
    sign
} from "../util/ed25519";
import mqttService from "./mqtt.service";


class MasterKeyService {

    private privateKey!: KeyObject;
    private publicKey!: KeyObject;

    constructor() {

    }

    async init(): Promise<void> {
        await this.loadOrCreateKeyPair();
        await this.publishIdentity();
    }

    sign(data: NodeJS.ArrayBufferView): Buffer {
        return sign(data, this.privateKey);
    }

    getPublicKey(): KeyObject {
        return this.publicKey;
    }

    private async loadOrCreateKeyPair(): Promise<void> {
        const workspace = process.env.UHN_WORKSPACE_PATH;
        if (!workspace) {
            throw new Error("UHN_WORKSPACE_PATH not set");
        }

        const keyDir = path.join(workspace, "keys");
        const privPath = path.join(keyDir, "master.ed25519");

        await fs.mkdir(keyDir, { recursive: true });
        await fs.chmod(keyDir, 0o700);

        try {
            const der = await fs.readFile(privPath);
            this.privateKey = importPrivateKeyBase64(der.toString());
            this.publicKey = getPublicKeyFromPrivate(this.privateKey);
        } catch (err: any) {
            if (err.code !== "ENOENT") throw err;

            const kp = generateKeyPair();
            this.privateKey = kp.privateKey;
            this.publicKey = kp.publicKey;

            await fs.writeFile(privPath, exportPrivateKeyBase64(this.privateKey), {
                mode: 0o600,
            });
            await fs.chmod(privPath, 0o600);
        }
    }

    private publishIdentity() {
        mqttService.publish(
            "uhn/master/identity",
            {
                publicKey: exportPublicKeyBase64(this.publicKey),
                algorithm: "ed25519",
                ts: Date.now()
            },
            { qos: 1, retain: true });
    }
}

export const masterKeyService = new MasterKeyService();
masterKeyService.init().catch(err => {
    console.error("Failed to initialize MasterKeyService:", err);
    process.exit(1);
});
