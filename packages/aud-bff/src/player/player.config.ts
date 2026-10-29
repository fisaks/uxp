import { MpvConfig } from "./mpv-engine";

export type PlayerConfig = {
    /** "mpv" plays the music, "fake" only counts the time of the tracks (development without speakers or mpv). */
    engine: "mpv" | "fake";
    mpv: MpvConfig;
};

export const playerConfig: PlayerConfig = {
    engine: process.env.AUD_PLAYER === "fake" ? "fake" : "mpv",
    mpv: { command: process.env.AUD_MPV_COMMAND || "mpv", audioDevice: process.env.AUD_MPV_AUDIO_DEVICE || undefined },
};
