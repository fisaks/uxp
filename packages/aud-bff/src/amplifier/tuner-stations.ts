import { TunerStation } from "@aud/common";
import { readFileSync } from "fs";

/**
 * Reads the station list file: { "stations": [{ "name": "Loop", "frequency": 10180, "favorite": true }] }, the frequency in units of 10 kHz
 * and "favorite" optional.
 * Other fields, such as a note, are for people and ignored. A file that cannot be used stops the server at startup.
 */
export const loadTunerStations = (path: string): TunerStation[] => {
    let content: { stations?: unknown };
    try {
        content = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
        throw new Error(`Cannot read the tuner station list ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!Array.isArray(content?.stations)) {
        throw new Error(`The tuner station list ${path} has no "stations" array`);
    }
    return content.stations.map((station, index) => {
        const { name, frequency, favorite } = station ?? {};
        if (typeof name !== "string" || name.trim() === "" || !Number.isInteger(frequency)) {
            throw new Error(`Station ${index + 1} in ${path} needs a name and a whole-number frequency in units of 10 kHz`);
        }
        if (favorite !== undefined && typeof favorite !== "boolean") {
            throw new Error(`Station ${index + 1} in ${path} has a "favorite" that is not true or false`);
        }
        return favorite ? { name, frequency, favorite } : { name, frequency };
    });
};

/**
 * The stations to show when there is no station list file: the presets stored in the amplifier. The amplifier gives a
 * preset only as a title such as "1 : FM 101.10 MHz" and has no names, so the name is "Preset 1". Presets that are not FM
 * (or whose title has another form) are left out, because the tuner is tuned by frequency.
 */
export const stationsFromPresets = (presets: { id: string; title: string }[]): TunerStation[] =>
    presets.flatMap(({ id, title }) => {
        const mhz = /\bFM\s+(\d+(?:\.\d+)?)\s*MHz/i.exec(title)?.[1];
        return mhz ? [{ name: `Preset ${id}`, frequency: Math.round(Number(mhz) * 100) }] : [];
    });
