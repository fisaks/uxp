import { SpotifyNowPlaying } from "@aud/common";
import { AppLogger } from "@uxp/bff-common";

const RECONNECT_MS = 5000;
// How long the amplifier may take to be ready before Spotify is held back, so none of its beginning is lost. An amplifier that is
// already on answers well inside this, and then Spotify is not touched.
const HOLD_AFTER_MS = 400;

type Named = { entity?: { decorations?: { identity?: { name?: string } } } };

/** What Soloist reports of the playback (the part that is used). */
type PlaybackState = {
    type?: string;
    status?: string;
    item?: {
        decorations?: {
            identity?: { name?: string };
            visual_identity?: { cover?: { url: string; size: string }[] };
            parent?: Named;
            creators?: Named[];
            playback?: { duration_ms?: number };
        };
    };
    position?: { position_ms?: number; timestamp_ms?: number };
};

// Between tracks, and while a track starts, Soloist reports these: Spotify is still what plays, and a client should not see a gap.
const PLAYING_STATUSES = ["playing", "buffering", "loading"];
const BETWEEN_TRACKS_STATUSES = ["ended", "buffering", "loading"];

const nowPlayingOf = (message: PlaybackState): SpotifyNowPlaying | undefined => {
    const decorations = message.item?.decorations;
    const playing = PLAYING_STATUSES.includes(message.status ?? "");
    if (!decorations?.identity?.name || (!playing && message.status !== "paused")) {
        return undefined;
    }
    const durationSec = Math.round((decorations.playback?.duration_ms ?? 0) / 1000);
    // The position is the one at the time Soloist stamped it: while playing it has moved on since.
    const sinceSec = playing && message.position?.timestamp_ms ? Math.max(0, (Date.now() - message.position.timestamp_ms) / 1000) : 0;
    const covers = decorations.visual_identity?.cover ?? [];
    return {
        status: playing ? "playing" : "paused",
        title: decorations.identity.name,
        artist: (decorations.creators ?? []).flatMap((creator) => creator.entity?.decorations?.identity?.name ?? []).join(", "),
        album: decorations.parent?.entity?.decorations?.identity?.name ?? "",
        coverUrl: (covers.find((cover) => cover.size === "default") ?? covers[0])?.url,
        positionSec: Math.min((message.position?.position_ms ?? 0) / 1000 + sinceSec, durationSec || Infinity),
        durationSec,
    };
};

/**
 * The connection to the Spotify player (Soloist) on the same machine, over its WebSocket API. Soloist plays Spotify to the
 * same sound server as the player, and the two never play at the same time: when Spotify starts the player gives way
 * (`onPlaying`), and when the user starts the player Spotify is paused (`pause`). Spotify starts when it is picked in the Spotify
 * app, with the amplifier perhaps off: it is made ready (`prepare`) and Spotify waits for it. The API has no login, so it is only
 * reached on the machine itself. The connection is opened again when it drops, and Soloist reports its state at once when it
 * is opened.
 */
export class SoloistClient {
    private socket?: WebSocket;
    private playing = false;
    private current?: SpotifyNowPlaying;
    /** When `current` was received: its position is the one of that time. */
    private currentAt = 0;
    /** Spotify is held back until the amplifier is ready: what Soloist reports meanwhile is ours (the pause) or the user's (overridden). */
    private holding = false;

    constructor(
        private readonly url: string | undefined,
        private readonly onPlaying: () => void,
        private readonly prepare: () => Promise<void>,
        private readonly onChange: () => void
    ) {}

    start() {
        if (this.url) {
            this.connect(this.url);
        }
    }

    /** The user started the player: Spotify gives way, if it plays. */
    pause() {
        if (this.playing) {
            this.send("pause");
            // Soloist reports the pause, this only keeps a second start of the player from sending it twice.
            this.playing = false;
        }
    }

    /** What Spotify plays or has paused, when it is known. */
    nowPlaying(): SpotifyNowPlaying | undefined {
        const current = this.current;
        if (!current || current.status !== "playing") {
            return current;
        }
        // The position was true when it was received, and it has moved on since.
        const positionSec = current.positionSec + (Date.now() - this.currentAt) / 1000;
        return { ...current, positionSec: Math.min(positionSec, current.durationSec || Infinity) };
    }

    /** A button of the player, while Spotify is what is played: "play", "pause", "skip_next" or "skip_prev". */
    control(command: "play" | "pause" | "skip_next" | "skip_prev") {
        this.send(command);
    }

    seek(positionSec: number) {
        this.send("seek", { position_ms: Math.round(positionSec * 1000) });
    }

    private send(command: string, fields: object = {}) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "command", command, ...fields }));
        }
    }

    /** Spotify started to play: the player gives way, and the amplifier is made ready, with Spotify held back if that takes a while. */
    private async onStarted() {
        this.onPlaying();
        const prepared = this.prepare();
        const inTime = await Promise.race([
            prepared.then(() => true),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), HOLD_AFTER_MS)),
        ]);
        if (inTime) {
            return;
        }
        this.holding = true;
        this.send("pause");
        await prepared;
        this.holding = false;
        this.send("play");
        this.playing = true;
    }

    private connect(url: string) {
        const socket = new WebSocket(url);
        this.socket = socket;
        socket.onmessage = (event) => this.onMessage(String(event.data));
        socket.onclose = () => {
            this.playing = false;
            this.setCurrent(undefined);
            setTimeout(() => this.connect(url), RECONNECT_MS);
        };
        // The close that follows an error reconnects.
        socket.onerror = () => undefined;
    }

    private setCurrent(current: SpotifyNowPlaying | undefined) {
        this.current = current;
        this.currentAt = Date.now();
        this.onChange();
    }

    private onMessage(data: string) {
        let message: PlaybackState;
        try {
            message = JSON.parse(data);
        } catch {
            AppLogger.warn(undefined, { message: "Soloist sent something that is not JSON" });
            return;
        }
        if (message.type !== "playback_state" || this.holding) {
            return;
        }
        const current = nowPlayingOf(message);
        // A report between tracks that says nothing of the track leaves what is shown as it is.
        if (current || !BETWEEN_TRACKS_STATUSES.includes(message.status ?? "")) {
            this.setCurrent(current);
        }
        const playing = PLAYING_STATUSES.includes(message.status ?? "");
        const started = playing && !this.playing;
        this.playing = playing;
        if (started) {
            void this.onStarted();
        }
    }
}
