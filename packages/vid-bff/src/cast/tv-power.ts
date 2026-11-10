import { AppLogger, SerializedJsonWriter, tryReadJsonFile } from "@uxp/bff-common";
import { grantPairing, PendingPairing, requestPairing, TvCredentials } from "./philips-tv";

// The TV shows the PIN for about a minute.
const PENDING_MS = 2 * 60 * 1000;

/**
 * The pairings with the Philips TVs, by Chromecast id, in a file in the data folder (never in the repository). A paired TV is the
 * one that may be switched on and off from here.
 */
export class TvPower {
    private pairings: Record<string, TvCredentials> = {};
    private readonly pending = new Map<string, { pairing: PendingPairing; expires: number }>();
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly file?: string) {
        if (file) {
            this.writer = new SerializedJsonWriter(file, (error) =>
                AppLogger.warn(undefined, { message: "[Cast] Could not save the TV pairings", error })
            );
        }
    }

    async load(): Promise<void> {
        if (this.file) {
            this.pairings = (await tryReadJsonFile<Record<string, TvCredentials>>(this.file)) ?? {};
        }
    }

    credentials(deviceId: string): TvCredentials | undefined {
        return this.pairings[deviceId];
    }

    /** Makes the TV show a PIN. */
    async start(deviceId: string, host: string): Promise<void> {
        if (!this.writer) {
            throw new Error("There is nowhere to keep a pairing: VID_DATA_DIR is not set");
        }
        this.pending.set(deviceId, { pairing: await requestPairing(host), expires: Date.now() + PENDING_MS });
    }

    /** Finishes the pairing that `start` began, and keeps it. */
    async confirm(deviceId: string, host: string, pin: string): Promise<void> {
        const entry = this.pending.get(deviceId);
        if (!entry || entry.expires < Date.now()) {
            this.pending.delete(deviceId);
            throw new Error("The pairing has timed out, start again");
        }
        this.pairings[deviceId] = await grantPairing(host, entry.pairing, pin);
        this.pending.delete(deviceId);
        await this.writer?.write(this.pairings);
    }

    async forget(deviceId: string): Promise<void> {
        delete this.pairings[deviceId];
        this.pending.delete(deviceId);
        await this.writer?.write(this.pairings);
    }
}
