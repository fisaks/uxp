import { ChromecastPlayback } from "@aud/common";

/** The app that casts and who made what plays, for example "Spotify · Artist". */
export const chromecastSubtitle = (app: string | null, playback: ChromecastPlayback): string =>
    [app, playback.artist].filter(Boolean).join(" · ");
