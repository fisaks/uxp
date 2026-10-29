import { TunerStation } from "@aud/common";
import env from "../env";
import { loadTunerStations } from "./tuner-stations";

export type AmplifierConfig = {
    /** Host name or IP address of the amplifier, with an optional port. */
    host: string;
    /** The inputs to show, in order. When not set, all inputs the amplifier offers are shown. */
    inputs?: { id: string; label?: string }[];
    /** The input the sound of the player arrives on. When set, playing music turns the amplifier on and selects it. */
    playerInput?: string;
    /** The stations of the tuner, in order. When not set, the presets stored in the amplifier are used. */
    tunerStations?: TunerStation[];
};

/** Parses "AV5=Music App,HDMI1=Chromecast,TUNER". An input without a label uses the title of the amplifier. */
const parseInputs = (value: string | undefined): AmplifierConfig["inputs"] => {
    if (value === undefined || value.trim() === "") {
        return undefined;
    }
    return value.split(",").map((entry) => {
        const separator = entry.indexOf("=");
        return separator === -1 ? { id: entry.trim() } : { id: entry.slice(0, separator).trim(), label: entry.slice(separator + 1).trim() };
    });
};

export const amplifierConfig: AmplifierConfig = {
    host: env.AUD_AMPLIFIER_HOST,
    inputs: parseInputs(process.env.AUD_AMPLIFIER_INPUTS),
    playerInput: process.env.AUD_AMPLIFIER_PLAYER_INPUT || undefined,
    tunerStations: process.env.AUD_TUNER_STATIONS_FILE ? loadTunerStations(process.env.AUD_TUNER_STATIONS_FILE) : undefined,
};
