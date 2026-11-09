import { ChromecastPlayback } from "@vid/common";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

/** A signal weaker than this makes the stream stutter. */
const WEAK_SIGNAL_DBM = -75;
const GOOD_SIGNAL_DBM = -60;

export const uptimeText = (seconds: number): string => {
    if (seconds >= SECONDS_PER_DAY) {
        return `${Math.floor(seconds / SECONDS_PER_DAY)} d ${Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)} h`;
    }
    if (seconds >= SECONDS_PER_HOUR) {
        return `${Math.floor(seconds / SECONDS_PER_HOUR)} h ${Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)} min`;
    }
    return `${Math.floor(seconds / SECONDS_PER_MINUTE)} min`;
};

export const isWeakSignal = (dbm: number) => dbm < WEAK_SIGNAL_DBM;

export const wifiSignalText = (dbm: number): string => {
    const quality = dbm >= GOOD_SIGNAL_DBM ? "Good" : isWeakSignal(dbm) ? "Weak" : "Fair";
    return `${quality} (${dbm} dBm)`;
};

const STATE_TEXT: Record<ChromecastPlayback["state"], string> = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    BUFFERING: "Buffering",
    IDLE: "Idle",
};

export const playbackStateText = (playback: ChromecastPlayback) => STATE_TEXT[playback.state];

/** Where it is now: the position of the last push, moved on by the time since then while it plays. */
export const playbackPosition = (playback: ChromecastPlayback, now: number) => {
    const elapsed = playback.state === "PLAYING" ? (now - playback.updatedAt) / 1000 : 0;
    const position = playback.positionSec + elapsed;
    return playback.durationSec ? Math.min(position, playback.durationSec) : position;
};
