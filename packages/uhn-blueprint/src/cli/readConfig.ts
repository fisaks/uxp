import fs from "fs-extra";
import path from "path";
import os from "os";

export type UhnConfig = {
    url: string;
    identifier: string;
    token: string;
};

const UHN_DIR = path.join(os.homedir(), ".uhn");

export function readConfig(identifier: string): UhnConfig {
    const dirStat = safeStat(UHN_DIR);
    if (!dirStat) {
        throw new Error(
            `No config found for blueprint "${identifier}".\n` +
            `Download the .uhn file from the UHN admin UI and place it in ~/.uhn/`
        );
    }

    if (!dirStat.isDirectory()) {
        throw new Error(`${UHN_DIR} exists but is not a directory.`);
    }

    const dirMode = dirStat.mode & 0o777;
    if (dirMode !== 0o700) {
        throw new Error(
            `~/.uhn directory permissions must be 700 (current: ${dirMode.toString(8)}).\n` +
            `Run: chmod 700 ~/.uhn`
        );
    }

    const filePath = path.join(UHN_DIR, `${identifier}.json`);
    const fileStat = safeStat(filePath);
    if (!fileStat) {
        throw new Error(
            `No config found for blueprint "${identifier}".\n` +
            `Download the .uhn file from the UHN admin UI and place it in ~/.uhn/`
        );
    }

    const fileMode = fileStat.mode & 0o777;
    if (fileMode !== 0o600) {
        throw new Error(
            `~/.uhn/${identifier}.json permissions must be 600 (current: ${fileMode.toString(8)}).\n` +
            `Run: chmod 600 ~/.uhn/${identifier}.json`
        );
    }

    const data = fs.readJsonSync(filePath);

    if (!data.url || typeof data.url !== "string") {
        throw new Error(`~/.uhn/${identifier}.json is missing a valid "url" field.`);
    }
    if (!data.token || typeof data.token !== "string") {
        throw new Error(`~/.uhn/${identifier}.json is missing a valid "token" field.`);
    }

    return {
        url: data.url,
        identifier: data.identifier ?? identifier,
        token: data.token,
    };
}

function safeStat(p: string): fs.Stats | null {
    try {
        return fs.statSync(p);
    } catch {
        return null;
    }
}
