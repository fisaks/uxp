import { AppLogger, tryReadJsonFile, SerializedJsonWriter } from "@uxp/bff-common";
import path from "path";
import { libraryConfig } from "../library/library.config";

const FILE = "track-gain.json";

/** How much louder a track is played. The name ("Artist - Title") is for whoever reads the file. */
type StoredGain = { gainDb: number; name: string };

const isStoredGain = (value: unknown): value is StoredGain => typeof (value as StoredGain | undefined)?.gainDb === "number";

/**
 * How much louder than normal the tracks that were set louder are played, in `track-gain.json` in the data folder, by the id
 * of the track. A track without an entry plays at normal level. Without a data folder nothing is kept after a restart.
 */
export class TrackGainStore {
    private tracks = new Map<string, StoredGain>();
    private readonly writer?: SerializedJsonWriter;

    constructor(private readonly dataDir?: string) {
        this.writer =
            dataDir === undefined
                ? undefined
                : new SerializedJsonWriter(path.join(dataDir, FILE), (error) =>
                      AppLogger.warn(undefined, { message: "Could not save the gain of the tracks", error })
                  );
    }

    async load() {
        const saved = this.dataDir && (await tryReadJsonFile<Record<string, unknown>>(path.join(this.dataDir, FILE)));
        this.tracks = new Map(Object.entries(saved || {}).filter((entry): entry is [string, StoredGain] => isStoredGain(entry[1])));
    }

    /** The gain of the track in dB, 0 when it has none. */
    get(trackId: string): number {
        return this.tracks.get(trackId)?.gainDb ?? 0;
    }

    /** Keeps the gain of the track. 0 is the normal level, which is not kept. */
    set(trackId: string, name: string, gainDb: number) {
        if (gainDb === 0) {
            this.tracks.delete(trackId);
        } else {
            this.tracks.set(trackId, { gainDb, name });
        }
        void this.writer?.write(Object.fromEntries(this.tracks));
    }
}

export const trackGainStore = new TrackGainStore(libraryConfig.dataDir);
