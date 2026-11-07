import { ChromecastPlayback } from "@aud/common";

/** The app that casts and who made what plays, for example "Spotify · Artist". */
export const chromecastSubtitle = (app: string | null, playback: ChromecastPlayback): string =>
    [app, playback.artist].filter(Boolean).join(" · ");

/** A signal weaker than this makes the stream stutter; the health check and the details page both go by it. */
export const CHROMECAST_WEAK_SIGNAL_DBM = -75;
const GOOD_SIGNAL_DBM = -60;

export const wifiSignalText = (dbm: number): string => {
    const quality = dbm >= GOOD_SIGNAL_DBM ? "Good" : dbm >= CHROMECAST_WEAK_SIGNAL_DBM ? "Fair" : "Weak";
    return `${quality} (${dbm} dBm)`;
};
