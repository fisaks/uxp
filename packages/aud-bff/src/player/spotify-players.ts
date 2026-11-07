import { SpotifyHealth, SpotifyNowPlaying, SpotifyQueueEntry } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";
import { SoloistClient } from "./soloist-client";

type Callbacks = {
    /** Spotify started to play, from a Spotify app. */
    onPlaying: () => void;
    prepare: () => Promise<void>;
    onChange: () => void;
    onOwnedChange: (change: "playing" | "paused" | "ended") => void;
};

/**
 * The two Spotify players (Soloist instances) of the machine. The house one plays what the player's own queue asks for, as an
 * account of its own that nobody else uses. The public one is the device a phone picks, as whichever account picks it. They
 * play to the same sound server and the sound of both would be heard, so only one of them plays: what the player starts
 * pauses the public one, and what a phone starts on the public one pauses the house one (and the player, as Spotify always did).
 * The one a phone started is the source of the buttons and of what is shown, until the player starts something.
 */
export class SpotifyPlayers {
    private readonly house: SoloistClient;
    private readonly pub: SoloistClient;
    /** The player that was started from a Spotify app and has not been given way to since. */
    private source?: SoloistClient;
    private readonly onPlaying: () => void;

    constructor(
        urls: { public?: string; house?: string },
        dir: string | undefined,
        { onPlaying, prepare, onChange, onOwnedChange }: Callbacks
    ) {
        this.onPlaying = onPlaying;
        this.pub = new SoloistClient(urls.public, dir, () => this.started(this.pub, this.house), prepare, onChange, () => undefined);
        this.house = new SoloistClient(urls.house, undefined, () => this.started(this.house, this.pub), prepare, onChange, onOwnedChange);
    }

    /** Spotify was started from a Spotify app, on one of the two: the other one gives way, and so does the player. */
    private started(client: SoloistClient, other: SoloistClient) {
        other.pause();
        this.source = client;
        this.onPlaying();
    }

    start() {
        this.pub.start();
        this.house.start();
    }

    /** The one that the buttons and the shown Spotify are: the one a phone started, else the public one, which phones use. */
    private get shown(): SoloistClient {
        return this.source ?? this.pub;
    }

    nowPlaying(): SpotifyNowPlaying | undefined {
        return this.shown.nowPlaying();
    }

    /** Where the track of the queue that the house player plays is. */
    ownedPositionSec(): number {
        return this.house.nowPlaying()?.positionSec ?? 0;
    }

    /** The player starts something that is not a Spotify track of its own: both Spotify players give way. */
    pause() {
        this.source = undefined;
        this.house.pause();
        this.pub.pause();
    }

    control(command: "play" | "pause" | "skip_next" | "skip_prev") {
        this.shown.control(command);
    }

    seek(positionSec: number) {
        this.shown.seek(positionSec);
    }

    /** Seeks in the track of the queue that the house player plays. */
    seekOwned(positionSec: number) {
        this.house.seek(positionSec);
    }

    playOwned(uri: string): boolean {
        this.pub.pause();
        this.source = undefined;
        const played = this.house.playOwned(uri);
        if (!played) {
            AppLogger.warn(undefined, { message: "[Soloist] The house player cannot be reached" });
        }
        return played;
    }

    owns(uri: string): boolean {
        return this.house.owns(uri);
    }

    releaseOwned() {
        this.house.releaseOwned();
    }

    find(uris: string[]): SpotifyQueueEntry[] {
        const found = this.pub.find(uris);
        return found.length === uris.length ? found : this.shown.find(uris);
    }

    async health(): Promise<Omit<SpotifyHealth, "catalog">> {
        const pub = await this.pub.health();
        return { ...pub, houseReachable: (await this.house.health()).reachable };
    }
}
