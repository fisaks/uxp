import { MplayerConfig } from "./mplayer-engine";
import { MpvConfig } from "./mpv-engine";

export type PlayerConfig = {
    /** "mpv" and "mplayer" play the music, "fake" only counts the time of the tracks (development without speakers). */
    engine: "mpv" | "mplayer" | "fake";
    mpv: MpvConfig;
    mplayer: MplayerConfig;
};

const ENGINES: PlayerConfig["engine"][] = ["mpv", "mplayer", "fake"];

export const playerConfig: PlayerConfig = {
    engine: ENGINES.find((engine) => engine === process.env.AUD_PLAYER) ?? "mpv",
    mpv: { command: process.env.AUD_MPV_COMMAND || "mpv", audioDevice: process.env.AUD_MPV_AUDIO_DEVICE || undefined },
    mplayer: { command: process.env.AUD_MPLAYER_COMMAND || "mplayer", audioOutput: process.env.AUD_MPLAYER_AUDIO_OUTPUT || undefined },
};
