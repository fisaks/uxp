/** What the Chromecast says it is doing with the media of the running app. */
export type ChromecastPlaybackState = "PLAYING" | "PAUSED" | "BUFFERING" | "IDLE";

/** Which transport buttons make sense, from the `supportedMediaCommands` the app reports. */
export type ChromecastCommands = {
    pause: boolean;
    seek: boolean;
    next: boolean;
    previous: boolean;
};

/** The media of the running app. Only whitelisted fields: the raw status can carry a stream URL with a token. */
export type ChromecastPlayback = {
    state: ChromecastPlaybackState;
    title: string;
    artist?: string;
    album?: string;
    /** The largest cover the app reports, a public URL. */
    coverUrl?: string;
    positionSec: number;
    /** Missing for a live stream. */
    durationSec?: number;
    commands: ChromecastCommands;
    /** The tracks the app says come next, as far as it tells (Spotify). Missing when it tells nothing. */
    upcoming?: ChromecastUpcoming[];
};

export type ChromecastUpcoming = {
    title: string;
    artist?: string;
};

/** What the device reports about itself. Refreshed about once a minute, not on every push. */
export type ChromecastDevice = {
    name: string;
    firmware: string;
    uptimeSec: number;
    wifiSignalDbm?: number;
    ip: string;
    hasUpdate: boolean;
};

export type ChromecastState = {
    /** False when the server has no Chromecast to watch (`AUD_CHROMECAST_HOST` not set): the UI then shows nothing of it. */
    configured: boolean;
    /** False when the device does not answer, for example while it reboots or sleeps. */
    reachable: boolean;
    /** The name of the running app (receiver displayName), null when none runs. */
    app: string | null;
    /** Null when the app has no media, for example a receiver that sits open and empty. */
    playback: ChromecastPlayback | null;
    /** Missing until the first successful read. */
    device?: ChromecastDevice;
    /** The app that last started to play and when (ISO time). Missing until something has been cast since the server started. */
    lastCast?: { app: string; at: string };
};

/** The answer to the health check. */
export type ChromecastHealth = {
    /** False when the server has no Chromecast to watch: the health check then has no item for it. */
    enabled: boolean;
    reachable: boolean;
    /** How long the device has not answered, missing while it is connected. */
    unreachableSec?: number;
    wifiSignalDbm?: number;
};
