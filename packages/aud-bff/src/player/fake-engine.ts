import { PlayOptions, PlayerEngine, PlayerEngineListener } from "./player-engine";

const TICK_MS = 500;
const DEFAULT_DURATION_SEC = 180;

/** Plays nothing: it only counts the time of the track, for development on a machine without mpv or without speakers. */
export class FakePlayerEngine implements PlayerEngine {
    private listener?: PlayerEngineListener;
    private timer?: NodeJS.Timeout;
    private positionSec = 0;
    private durationSec = DEFAULT_DURATION_SEC;
    private paused = false;

    setListener(listener: PlayerEngineListener) {
        this.listener = listener;
    }

    async play(_file: string, { durationSec, startSec }: PlayOptions) {
        this.stop();
        this.positionSec = startSec;
        this.durationSec = durationSec || DEFAULT_DURATION_SEC;
        this.paused = false;
        this.timer = setInterval(() => this.tick(), TICK_MS);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    stop() {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    seek(positionSec: number) {
        this.positionSec = positionSec;
    }

    private tick() {
        if (this.paused) {
            return;
        }
        this.positionSec += TICK_MS / 1000;
        if (this.positionSec >= this.durationSec) {
            this.stop();
            this.listener?.onEnded();
        } else {
            this.listener?.onPosition(this.positionSec);
        }
    }
}
